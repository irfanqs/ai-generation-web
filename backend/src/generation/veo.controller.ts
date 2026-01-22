import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NonAdminGuard } from './non-admin.guard';
import { VeoService, VeoConfig, ReferenceImage, InterpolationConfig } from './veo.service';
import { GenerationService } from './generation.service';
import { PrismaService } from '../prisma/prisma.service';
import { calculateCreditCost } from './credit-costs.config';

class TextToVideoDto {
  prompt: string;
  aspectRatio?: '16:9' | '9:16';
  negativePrompt?: string;
  model?: string;
}

class ImageToVideoDto {
  imageBase64?: string;
  imageUrl?: string;
  prompt?: string;
  aspectRatio?: '16:9' | '9:16';
  negativePrompt?: string;
}

class VideoWithReferencesDto {
  prompt: string;
  referenceImages: ReferenceImage[];
  aspectRatio?: '16:9' | '9:16';
  negativePrompt?: string;
}

class InterpolateVideoDto {
  firstFrameBase64: string;
  lastFrameBase64: string;
  prompt?: string;
  aspectRatio?: '16:9' | '9:16';
}

class ExtendVideoDto {
  videoBase64: string;
  prompt?: string;
}

class LongVideoDto {
  initialPrompt: string;
  segments: { prompt: string }[];
  referenceImages?: ReferenceImage[];
  aspectRatio?: '16:9' | '9:16';
}

class AutoGenerateScenesDto {
  imageBase64: string;
  additionalPrompt?: string;
}

@Controller('veo')
@UseGuards(JwtAuthGuard, NonAdminGuard)
export class VeoController {
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  
  constructor(
    private readonly veoService: VeoService,
    private readonly generationService: GenerationService,
    private readonly prisma: PrismaService,
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

  @Get('models')
  getModels() {
    return this.veoService.getModelsInfo();
  }

  @Post('text-to-video')
  async textToVideo(@Request() req, @Body() dto: TextToVideoDto) {
    const userId = req.user.id;
    const apiKey = await this.getUserApiKey(userId);
    const creditCost = calculateCreditCost('text-to-video');

    const hasCredits = await this.generationService.checkAndDeductCredits(userId, creditCost);
    if (!hasCredits) {
      throw new HttpException('Insufficient credits', HttpStatus.PAYMENT_REQUIRED);
    }

    try {
      const config: VeoConfig = {
        aspectRatio: dto.aspectRatio || '16:9',
        negativePrompt: dto.negativePrompt,
      };

      const result = await this.veoService.textToVideo(dto.prompt, apiKey, config, dto.model);

      await this.generationService.createGenerationRecord(userId, {
        type: 'text-to-video',
        prompt: dto.prompt,
        outputBase64: result.videoBase64,
        creditCost,
        metadata: { operationName: result.operationName, model: dto.model },
      });

      return { success: true, videoBase64: result.videoBase64, creditCost };
    } catch (error: any) {
      await this.generationService.refundCredits(userId, creditCost);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('image-to-video')
  async imageToVideo(@Request() req, @Body() dto: ImageToVideoDto) {
    const userId = req.user.id;
    const apiKey = await this.getUserApiKey(userId);
    const creditCost = calculateCreditCost('image-to-video');

    if (!dto.imageBase64 && !dto.imageUrl) {
      throw new HttpException('imageBase64 or imageUrl is required', HttpStatus.BAD_REQUEST);
    }

    const hasCredits = await this.generationService.checkAndDeductCredits(userId, creditCost);
    if (!hasCredits) {
      throw new HttpException('Insufficient credits', HttpStatus.PAYMENT_REQUIRED);
    }

    try {
      let imageBase64 = dto.imageBase64;
      
      if (!imageBase64 && dto.imageUrl) {
        const axios = require('axios');
        const response = await axios.get(dto.imageUrl, { responseType: 'arraybuffer' });
        imageBase64 = Buffer.from(response.data).toString('base64');
      }

      const config: VeoConfig = {
        aspectRatio: dto.aspectRatio || '16:9',
        negativePrompt: dto.negativePrompt,
      };

      const result = await this.veoService.imageToVideo(
        imageBase64,
        dto.prompt || 'Animate this image with smooth motion',
        apiKey,
        config,
      );

      await this.generationService.createGenerationRecord(userId, {
        type: 'image-to-video',
        prompt: dto.prompt,
        outputBase64: result.videoBase64,
        creditCost,
        metadata: { operationName: result.operationName },
      });

      return { success: true, videoBase64: result.videoBase64, creditCost };
    } catch (error: any) {
      await this.generationService.refundCredits(userId, creditCost);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('with-references')
  async videoWithReferences(@Request() req, @Body() dto: VideoWithReferencesDto) {
    const userId = req.user.id;
    const apiKey = await this.getUserApiKey(userId);
    const creditCost = calculateCreditCost('video-with-references');

    const hasCredits = await this.generationService.checkAndDeductCredits(userId, creditCost);
    if (!hasCredits) {
      throw new HttpException('Insufficient credits', HttpStatus.PAYMENT_REQUIRED);
    }

    try {
      const config: VeoConfig = {
        aspectRatio: dto.aspectRatio || '16:9',
        negativePrompt: dto.negativePrompt,
      };

      const result = await this.veoService.videoWithReferences(dto.prompt, dto.referenceImages, apiKey, config);

      await this.generationService.createGenerationRecord(userId, {
        type: 'video-with-references',
        prompt: dto.prompt,
        outputBase64: result.videoBase64,
        creditCost,
        metadata: { operationName: result.operationName, referenceCount: dto.referenceImages.length },
      });

      return { success: true, videoBase64: result.videoBase64, creditCost };
    } catch (error: any) {
      await this.generationService.refundCredits(userId, creditCost);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('interpolate')
  async interpolateVideo(@Request() req, @Body() dto: InterpolateVideoDto) {
    const userId = req.user.id;
    const apiKey = await this.getUserApiKey(userId);
    const creditCost = calculateCreditCost('video-interpolation');

    const hasCredits = await this.generationService.checkAndDeductCredits(userId, creditCost);
    if (!hasCredits) {
      throw new HttpException('Insufficient credits', HttpStatus.PAYMENT_REQUIRED);
    }

    try {
      const interpolation: InterpolationConfig = {
        firstFrameBase64: dto.firstFrameBase64,
        lastFrameBase64: dto.lastFrameBase64,
        prompt: dto.prompt,
      };

      const config: VeoConfig = { aspectRatio: dto.aspectRatio || '16:9' };
      const result = await this.veoService.interpolateVideo(interpolation, apiKey, config);

      await this.generationService.createGenerationRecord(userId, {
        type: 'video-interpolation',
        prompt: dto.prompt,
        outputBase64: result.videoBase64,
        creditCost,
        metadata: { operationName: result.operationName },
      });

      return { success: true, videoBase64: result.videoBase64, creditCost };
    } catch (error: any) {
      await this.generationService.refundCredits(userId, creditCost);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('extend')
  async extendVideo(@Request() req, @Body() dto: ExtendVideoDto) {
    const userId = req.user.id;
    const apiKey = await this.getUserApiKey(userId);
    const creditCost = calculateCreditCost('video-extension');

    const hasCredits = await this.generationService.checkAndDeductCredits(userId, creditCost);
    if (!hasCredits) {
      throw new HttpException('Insufficient credits', HttpStatus.PAYMENT_REQUIRED);
    }

    try {
      const result = await this.veoService.extendVideo(dto.videoBase64, { prompt: dto.prompt }, apiKey);

      await this.generationService.createGenerationRecord(userId, {
        type: 'video-extension',
        prompt: dto.prompt,
        outputBase64: result.videoBase64,
        creditCost,
        metadata: { operationName: result.operationName, totalDuration: result.totalDuration },
      });

      return { success: true, videoBase64: result.videoBase64, totalDuration: result.totalDuration, creditCost };
    } catch (error: any) {
      await this.generationService.refundCredits(userId, creditCost);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('long-video')
  async generateLongVideo(@Request() req, @Body() dto: LongVideoDto) {
    const userId = req.user.id;
    const apiKey = await this.getUserApiKey(userId);
    
    const initialCost = dto.referenceImages?.length 
      ? calculateCreditCost('video-with-references')
      : calculateCreditCost('text-to-video');
    const extensionCost = calculateCreditCost('video-extension') * dto.segments.length;
    const totalCreditCost = initialCost + extensionCost;

    const hasCredits = await this.generationService.checkAndDeductCredits(userId, totalCreditCost);
    if (!hasCredits) {
      throw new HttpException('Insufficient credits', HttpStatus.PAYMENT_REQUIRED);
    }

    try {
      const config: VeoConfig = { aspectRatio: dto.aspectRatio || '16:9' };
      const result = await this.veoService.generateLongVideo(
        dto.initialPrompt,
        dto.segments,
        apiKey,
        dto.referenceImages,
        config,
      );

      await this.generationService.createGenerationRecord(userId, {
        type: 'long-video',
        prompt: dto.initialPrompt,
        outputBase64: result.finalVideoBase64,
        creditCost: totalCreditCost,
        metadata: { segmentCount: result.segmentCount, totalDuration: result.totalDuration, segments: dto.segments },
      });

      return {
        success: true,
        videoBase64: result.finalVideoBase64,
        segmentCount: result.segmentCount,
        totalDuration: result.totalDuration,
        creditCost: totalCreditCost,
      };
    } catch (error: any) {
      await this.generationService.refundCredits(userId, totalCreditCost);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Auto-generate 4 scene prompts from image analysis
   * Analyzes the image and creates Hook, Problem, Solution, CTA prompts
   */
  @Post('auto-generate-scenes')
  async autoGenerateScenes(@Request() req, @Body() dto: AutoGenerateScenesDto) {
    const userId = req.user.id;
    const apiKey = await this.getUserApiKey(userId);

    if (!dto.imageBase64) {
      throw new HttpException('Image is required', HttpStatus.BAD_REQUEST);
    }

    // Cost: 2 credits for scene generation
    const creditCost = 2;
    const hasCredits = await this.generationService.checkAndDeductCredits(userId, creditCost);
    if (!hasCredits) {
      throw new HttpException('Insufficient credits. Need 2 credits.', HttpStatus.PAYMENT_REQUIRED);
    }

    try {
      const axios = require('axios');
      
      const prompt = `Analyze this image carefully. This appears to be a product or person that will be used for video advertisement.

Based on what you see in the image, create 4 video scene prompts for a marketing video. Each scene should be a detailed cinematic prompt for AI video generation.

${dto.additionalPrompt ? `Additional context from user: ${dto.additionalPrompt}` : ''}

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{
  "productName": "Detected product/subject name",
  "scenes": [
    {
      "name": "Hook",
      "description": "Menarik perhatian viewer",
      "prompt": "Detailed cinematic prompt for hook scene. Include camera angle, lighting, action, mood. Make it attention-grabbing."
    },
    {
      "name": "Problem",
      "description": "Menunjukkan masalah",
      "prompt": "Detailed cinematic prompt showing a problem or pain point. Include expressions, setting, atmosphere."
    },
    {
      "name": "Solution",
      "description": "Produk sebagai solusi",
      "prompt": "Detailed cinematic prompt showing the product/subject as the solution. Happy, satisfied mood, bright lighting."
    },
    {
      "name": "CTA",
      "description": "Call to Action",
      "prompt": "Detailed cinematic prompt for call-to-action. Professional, inviting, product prominently displayed."
    }
  ]
}

Make each prompt detailed (50-100 words) with specific camera movements, lighting, expressions, and actions. The prompts should work well for AI video generation.`;

      const url = `${this.baseUrl}/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      
      const response = await axios.post(url, {
        contents: [{
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: dto.imageBase64,
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 4096,
        }
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      });

      const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log('📝 [VeoController] Auto-generate scenes response:', text?.substring(0, 500));

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse scene prompts');
      }

      const result = JSON.parse(jsonMatch[0]);

      return {
        success: true,
        productName: result.productName,
        scenes: result.scenes,
        creditCost,
      };
    } catch (error: any) {
      // Refund credits on failure
      await this.generationService.refundCredits(userId, creditCost);
      console.error('💥 [VeoController] Auto-generate scenes error:', error.message);
      throw new HttpException(error.message || 'Failed to generate scenes', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
