import { Controller, Post, Body, UseGuards, Request, Get, Param, UseInterceptors, UploadedFile, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NonAdminGuard } from './non-admin.guard';
import { GenerationService } from './generation.service';
import { getCreditCostInfo, CREDIT_COSTS } from './credit-costs.config';

@Controller('generation')
@UseGuards(JwtAuthGuard)
export class GenerationController {
  constructor(private generationService: GenerationService) {}

  @Get('credit-costs')
  getCreditCosts() {
    return {
      costs: CREDIT_COSTS,
      info: Object.keys(CREDIT_COSTS).reduce((acc, type) => {
        acc[type] = getCreditCostInfo(type);
        return acc;
      }, {}),
    };
  }

  @Get('credit-cost/:type')
  getCreditCost(@Param('type') type: string) {
    return getCreditCostInfo(type);
  }

  @Post('text-to-image')
  @UseGuards(NonAdminGuard)
  async textToImage(@Request() req, @Body() body: { prompt: string; metadata?: any }) {
    console.log('🎯 [Controller] text-to-image request');
    console.log('📦 [Controller] Body:', body);
    console.log('📝 [Controller] Prompt:', body.prompt);
    console.log('📝 [Controller] Prompt type:', typeof body.prompt);
    
    return this.generationService.createGeneration(
      req.user.id,
      'text-to-image',
      body.prompt,
      undefined,
      body.metadata,
    );
  }

  @Post('image-to-image')
  @UseGuards(NonAdminGuard)
  @UseInterceptors(FileInterceptor('image'))
  async imageToImage(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { prompt: string; metadata?: any },
  ) {
    return this.generationService.createGeneration(
      req.user.id,
      'image-to-image',
      body.prompt,
      file,
      body.metadata,
    );
  }

  @Post('image-to-video')
  @UseGuards(NonAdminGuard)
  @UseInterceptors(FileInterceptor('image'))
  async imageToVideo(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { prompt?: string; duration?: string; metadata?: any },
  ) {
    return this.generationService.createGeneration(
      req.user.id,
      'image-to-video',
      body.prompt,
      file,
      { ...body.metadata, duration: body.duration },
    );
  }

  @Post('text-to-speech')
  @UseGuards(NonAdminGuard)
  async textToSpeech(@Request() req, @Body() body: { prompt: string; voice?: string; metadata?: any }) {
    return this.generationService.createGeneration(
      req.user.id,
      'text-to-speech',
      body.prompt,
      undefined,
      { ...body.metadata, voice: body.voice },
    );
  }

  @Get('history')
  @UseGuards(NonAdminGuard)
  async getHistory(@Request() req) {
    return this.generationService.getUserGenerations(req.user.id);
  }

  @Get(':id')
  @UseGuards(NonAdminGuard)
  async getGeneration(@Request() req, @Param('id') id: string) {
    return this.generationService.getGeneration(id, req.user.id);
  }
}
