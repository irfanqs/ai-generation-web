import { Controller, Post, Body, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NonAdminGuard } from './non-admin.guard';
import { GeminiService } from './gemini.service';
import { VeoService } from './veo.service';
import { CloudinaryService } from './cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

interface UploadReferenceDto {
  productImageBase64: string;
  modelImageBase64?: string;
}

interface GenerateAffiliateImageDto {
  prompt: string;
  productImageUrl: string;
  modelImageUrl?: string;
}

interface GenerateAffiliateVideoDto {
  imageBase64: string;
  prompt: string;
  aspectRatio?: '16:9' | '9:16';
}

@Controller('affiliate')
@UseGuards(JwtAuthGuard, NonAdminGuard)
export class AffiliateController {
  constructor(
    private gemini: GeminiService,
    private veoService: VeoService,
    private cloudinary: CloudinaryService,
    private prisma: PrismaService,
  ) {}

  private async getUserApiKey(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user?.geminiApiKey) {
      throw new HttpException('Please set your Gemini API key in Settings first', HttpStatus.BAD_REQUEST);
    }
    return user.geminiApiKey;
  }

  // Step 1: Upload reference images to Cloudinary first
  @Post('upload-references')
  async uploadReferences(@Request() req, @Body() dto: UploadReferenceDto) {
    console.log('📤 [AffiliateController] Uploading reference images...');

    if (!dto.productImageBase64) {
      throw new HttpException('Product image is required', HttpStatus.BAD_REQUEST);
    }

    try {
      // Upload product image
      const productDataUri = `data:image/jpeg;base64,${dto.productImageBase64}`;
      const productImageUrl = await this.cloudinary.uploadBase64(productDataUri, 'image');
      console.log('✅ [AffiliateController] Product image uploaded:', productImageUrl);

      // Upload model image if provided
      let modelImageUrl: string | null = null;
      if (dto.modelImageBase64) {
        const modelDataUri = `data:image/jpeg;base64,${dto.modelImageBase64}`;
        modelImageUrl = await this.cloudinary.uploadBase64(modelDataUri, 'image');
        console.log('✅ [AffiliateController] Model image uploaded:', modelImageUrl);
      }

      return {
        success: true,
        productImageUrl,
        modelImageUrl,
      };
    } catch (error: any) {
      console.error('💥 [AffiliateController] Upload error:', error.message);
      throw new HttpException(error.message || 'Failed to upload images', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Step 2: Generate image using URLs (faster, smaller payload)
  @Post('generate-image')
  async generateImage(@Request() req, @Body() dto: GenerateAffiliateImageDto) {
    console.log('🛍️ [AffiliateController] Generate image request');
    console.log('📝 [AffiliateController] Prompt:', dto.prompt?.substring(0, 100));

    if (!dto.prompt || !dto.productImageUrl) {
      throw new HttpException('Prompt and product image URL are required', HttpStatus.BAD_REQUEST);
    }

    // Get user's API key
    const apiKey = await this.getUserApiKey(req.user.id);

    // Check credits (4 credits per image)
    const user = await this.prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || user.credits < 4) {
      throw new HttpException('Insufficient credits. Need 4 credits.', HttpStatus.PAYMENT_REQUIRED);
    }

    try {
      // Download images from Cloudinary and convert to base64
      const productResponse = await axios.get(dto.productImageUrl, { responseType: 'arraybuffer' });
      const productBase64 = Buffer.from(productResponse.data).toString('base64');

      let modelBase64: string | undefined;
      if (dto.modelImageUrl) {
        const modelResponse = await axios.get(dto.modelImageUrl, { responseType: 'arraybuffer' });
        modelBase64 = Buffer.from(modelResponse.data).toString('base64');
      }

      // Build the prompt with image references
      let fullPrompt = `Using the provided product image as reference, create: ${dto.prompt}

IMPORTANT INSTRUCTIONS:
- The product in the generated image MUST look exactly like the reference product image
- Maintain the exact product design, colors, shape, and branding
- Only change the context/environment as described in the prompt
- Make it look like a professional product photography`;

      if (modelBase64) {
        fullPrompt += `\n- Use the provided model face reference for any human in the image
- The model's face should match the reference exactly`;
      }

      // Generate image with references
      const imageBase64 = await this.gemini.editImage(productBase64, fullPrompt, apiKey, modelBase64);

      // Upload to Cloudinary
      const imageDataUri = `data:image/png;base64,${imageBase64}`;
      const imageUrl = await this.cloudinary.uploadBase64(imageDataUri, 'image');

      // Deduct credits
      await this.prisma.user.update({
        where: { id: req.user.id },
        data: { credits: { decrement: 4 } }
      });

      // Save to generation history
      await this.prisma.generation.create({
        data: {
          userId: req.user.id,
          type: 'affiliate-image',
          prompt: dto.prompt,
          status: 'completed',
          outputUrl: imageUrl,
          metadata: { creditCost: 4 },
        }
      });

      console.log('✅ [AffiliateController] Image generated:', imageUrl);

      return {
        success: true,
        imageUrl,
      };
    } catch (error: any) {
      console.error('💥 [AffiliateController] Error:', error.message);
      throw new HttpException(error.message || 'Failed to generate image', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Step 3: Generate video from image using Veo image-to-video
  @Post('generate-video')
  async generateVideo(@Request() req, @Body() dto: GenerateAffiliateVideoDto) {
    console.log('🎬 [AffiliateController] Generate video request');
    console.log('📝 [AffiliateController] Prompt:', dto.prompt?.substring(0, 100));

    if (!dto.imageBase64) {
      throw new HttpException('Image is required', HttpStatus.BAD_REQUEST);
    }

    // Get user's API key
    const apiKey = await this.getUserApiKey(req.user.id);

    // Check credits (10 credits per video)
    const user = await this.prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || user.credits < 10) {
      throw new HttpException('Insufficient credits. Need 10 credits.', HttpStatus.PAYMENT_REQUIRED);
    }

    try {
      // Deduct credits first
      await this.prisma.user.update({
        where: { id: req.user.id },
        data: { credits: { decrement: 10 } }
      });

      // Generate video using VeoService image-to-video
      const videoPrompt = dto.prompt || 'Animate this product image with smooth, professional motion. Show the product from different angles with elegant camera movement.';
      
      const result = await this.veoService.imageToVideo(
        dto.imageBase64,
        videoPrompt,
        apiKey,
        { aspectRatio: dto.aspectRatio || '9:16' }
      );

      // Upload video to Cloudinary
      const videoDataUri = `data:video/mp4;base64,${result.videoBase64}`;
      const videoUrl = await this.cloudinary.uploadBase64(videoDataUri, 'video');

      // Save to generation history
      await this.prisma.generation.create({
        data: {
          userId: req.user.id,
          type: 'affiliate-video',
          prompt: dto.prompt,
          status: 'completed',
          outputUrl: videoUrl,
          metadata: { creditCost: 10, operationName: result.operationName },
        }
      });

      console.log('✅ [AffiliateController] Video generated:', videoUrl);

      return {
        success: true,
        videoUrl,
        videoBase64: result.videoBase64,
      };
    } catch (error: any) {
      // Refund credits on failure
      await this.prisma.user.update({
        where: { id: req.user.id },
        data: { credits: { increment: 10 } }
      });
      
      console.error('💥 [AffiliateController] Video error:', error.message);
      throw new HttpException(error.message || 'Failed to generate video', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
