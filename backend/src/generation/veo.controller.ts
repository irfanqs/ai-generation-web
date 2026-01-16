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
import { calculateCreditCost } from './credit-costs.config';
import { IsOptional, IsString } from 'class-validator';

// DTOs
class TextToVideoDto {
  @IsString()
  prompt: string;

  @IsOptional()
  @IsString()
  aspectRatio?: '16:9' | '9:16';

  @IsOptional()
  @IsString()
  negativePrompt?: string;

  @IsOptional()
  @IsString()
  model?: string;
}

class ImageToVideoDto {
  @IsOptional()
  @IsString()
  imageBase64?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  prompt?: string;

  @IsOptional()
  @IsString()
  aspectRatio?: '16:9' | '9:16';

  @IsOptional()
  @IsString()
  negativePrompt?: string;
}

class VideoWithReferencesDto {
  @IsString()
  prompt: string;

  referenceImages: ReferenceImage[];

  @IsOptional()
  @IsString()
  aspectRatio?: '16:9' | '9:16';

  @IsOptional()
  @IsString()
  negativePrompt?: string;
}

class InterpolateVideoDto {
  @IsString()
  firstFrameBase64: string;

  @IsString()
  lastFrameBase64: string;

  @IsOptional()
  @IsString()
  prompt?: string;

  @IsOptional()
  @IsString()
  aspectRatio?: '16:9' | '9:16';
}

class ExtendVideoDto {
  @IsString()
  videoBase64: string;

  @IsOptional()
  @IsString()
  prompt?: string;
}

class LongVideoDto {
  @IsString()
  initialPrompt: string;

  segments: { prompt: string }[];

  @IsOptional()
  referenceImages?: ReferenceImage[];

  @IsOptional()
  @IsString()
  aspectRatio?: '16:9' | '9:16';
}

@Controller('veo')
@UseGuards(JwtAuthGuard, NonAdminGuard)
export class VeoController {
  constructor(
    private readonly veoService: VeoService,
    private readonly generationService: GenerationService,
  ) {}

  /**
   * Get Veo models info
   */
  @Get('models')
  getModels() {
    return this.veoService.getModelsInfo();
  }

  /**
   * Text to Video generation
   */
  @Post('text-to-video')
  async textToVideo(@Request() req, @Body() dto: TextToVideoDto) {
    const userId = req.user.id;
    const creditCost = calculateCreditCost('text-to-video');

    // Check credits
    const hasCredits = await this.generationService.checkAndDeductCredits(userId, creditCost);
    if (!hasCredits) {
      throw new HttpException('Insufficient credits', HttpStatus.PAYMENT_REQUIRED);
    }

    try {
      const config: VeoConfig = {
        aspectRatio: dto.aspectRatio || '16:9',
        negativePrompt: dto.negativePrompt,
      };

      const result = await this.veoService.textToVideo(dto.prompt, config, dto.model);

      // Save generation record
      await this.generationService.createGenerationRecord(userId, {
        type: 'text-to-video',
        prompt: dto.prompt,
        outputBase64: result.videoBase64,
        creditCost,
        metadata: { operationName: result.operationName, model: dto.model },
      });

      return {
        success: true,
        videoBase64: result.videoBase64,
        creditCost,
      };
    } catch (error: any) {
      // Refund credits on failure
      await this.generationService.refundCredits(userId, creditCost);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Image to Video generation
   */
  @Post('image-to-video')
  async imageToVideo(@Request() req, @Body() dto: ImageToVideoDto) {
    const userId = req.user.id;
    const creditCost = calculateCreditCost('image-to-video');

    console.log('🎬 [VeoController] image-to-video request');
    console.log('🎬 [VeoController] Full DTO received:', JSON.stringify(dto, null, 2));
    console.log('🖼️ [VeoController] imageBase64 exists:', !!dto.imageBase64);
    console.log('🖼️ [VeoController] imageUrl exists:', !!dto.imageUrl);
    console.log('🖼️ [VeoController] imageUrl value:', dto.imageUrl);

    // Need either imageBase64 or imageUrl
    if (!dto.imageBase64 && !dto.imageUrl) {
      throw new HttpException('imageBase64 or imageUrl is required', HttpStatus.BAD_REQUEST);
    }

    const hasCredits = await this.generationService.checkAndDeductCredits(userId, creditCost);
    if (!hasCredits) {
      throw new HttpException('Insufficient credits', HttpStatus.PAYMENT_REQUIRED);
    }

    try {
      let imageBase64 = dto.imageBase64;
      
      // If URL provided, download and convert to base64
      if (!imageBase64 && dto.imageUrl) {
        console.log('📥 [VeoController] Downloading image from URL:', dto.imageUrl);
        const axios = require('axios');
        const response = await axios.get(dto.imageUrl, { responseType: 'arraybuffer' });
        imageBase64 = Buffer.from(response.data).toString('base64');
        console.log('✅ [VeoController] Image downloaded, base64 length:', imageBase64.length);
      }

      const config: VeoConfig = {
        aspectRatio: dto.aspectRatio || '16:9',
        negativePrompt: dto.negativePrompt,
      };

      const result = await this.veoService.imageToVideo(
        imageBase64,
        dto.prompt || 'Animate this image with smooth motion',
        config,
      );

      await this.generationService.createGenerationRecord(userId, {
        type: 'image-to-video',
        prompt: dto.prompt,
        outputBase64: result.videoBase64,
        creditCost,
        metadata: { operationName: result.operationName },
      });

      return {
        success: true,
        videoBase64: result.videoBase64,
        creditCost,
      };
    } catch (error: any) {
      await this.generationService.refundCredits(userId, creditCost);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Video with reference images for consistency
   */
  @Post('with-references')
  async videoWithReferences(@Request() req, @Body() dto: VideoWithReferencesDto) {
    const userId = req.user.id;
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

      const result = await this.veoService.videoWithReferences(
        dto.prompt,
        dto.referenceImages,
        config,
      );

      await this.generationService.createGenerationRecord(userId, {
        type: 'video-with-references',
        prompt: dto.prompt,
        outputBase64: result.videoBase64,
        creditCost,
        metadata: { 
          operationName: result.operationName,
          referenceCount: dto.referenceImages.length,
        },
      });

      return {
        success: true,
        videoBase64: result.videoBase64,
        creditCost,
      };
    } catch (error: any) {
      await this.generationService.refundCredits(userId, creditCost);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Interpolation video (first and last frame)
   */
  @Post('interpolate')
  async interpolateVideo(@Request() req, @Body() dto: InterpolateVideoDto) {
    const userId = req.user.id;
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

      const config: VeoConfig = {
        aspectRatio: dto.aspectRatio || '16:9',
      };

      const result = await this.veoService.interpolateVideo(interpolation, config);

      await this.generationService.createGenerationRecord(userId, {
        type: 'video-interpolation',
        prompt: dto.prompt,
        outputBase64: result.videoBase64,
        creditCost,
        metadata: { operationName: result.operationName },
      });

      return {
        success: true,
        videoBase64: result.videoBase64,
        creditCost,
      };
    } catch (error: any) {
      await this.generationService.refundCredits(userId, creditCost);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Extend existing video
   */
  @Post('extend')
  async extendVideo(@Request() req, @Body() dto: ExtendVideoDto) {
    const userId = req.user.id;
    const creditCost = calculateCreditCost('video-extension');

    const hasCredits = await this.generationService.checkAndDeductCredits(userId, creditCost);
    if (!hasCredits) {
      throw new HttpException('Insufficient credits', HttpStatus.PAYMENT_REQUIRED);
    }

    try {
      const result = await this.veoService.extendVideo(dto.videoBase64, {
        prompt: dto.prompt,
      });

      await this.generationService.createGenerationRecord(userId, {
        type: 'video-extension',
        prompt: dto.prompt,
        outputBase64: result.videoBase64,
        creditCost,
        metadata: { 
          operationName: result.operationName,
          totalDuration: result.totalDuration,
        },
      });

      return {
        success: true,
        videoBase64: result.videoBase64,
        totalDuration: result.totalDuration,
        creditCost,
      };
    } catch (error: any) {
      await this.generationService.refundCredits(userId, creditCost);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Generate long video (Google Flow-like)
   * Chains multiple extensions for videos up to 148 seconds
   */
  @Post('long-video')
  async generateLongVideo(@Request() req, @Body() dto: LongVideoDto) {
    const userId = req.user.id;
    
    // Calculate total cost: initial + extensions
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
      const config: VeoConfig = {
        aspectRatio: dto.aspectRatio || '16:9',
      };

      const result = await this.veoService.generateLongVideo(
        dto.initialPrompt,
        dto.segments,
        dto.referenceImages,
        config,
      );

      await this.generationService.createGenerationRecord(userId, {
        type: 'long-video',
        prompt: dto.initialPrompt,
        outputBase64: result.finalVideoBase64,
        creditCost: totalCreditCost,
        metadata: {
          segmentCount: result.segmentCount,
          totalDuration: result.totalDuration,
          segments: dto.segments,
        },
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
}
