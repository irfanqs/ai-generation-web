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

// DTOs
class TextToVideoDto {
  prompt: string;
  aspectRatio?: '16:9' | '9:16';
  negativePrompt?: string;
  model?: string;
}

class ImageToVideoDto {
  imageBase64: string;
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

    const hasCredits = await this.generationService.checkAndDeductCredits(userId, creditCost);
    if (!hasCredits) {
      throw new HttpException('Insufficient credits', HttpStatus.PAYMENT_REQUIRED);
    }

    try {
      const config: VeoConfig = {
        aspectRatio: dto.aspectRatio || '16:9',
        negativePrompt: dto.negativePrompt,
      };

      const result = await this.veoService.imageToVideo(
        dto.imageBase64,
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
