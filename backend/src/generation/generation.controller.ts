import { Controller, Post, Body, UseGuards, Request, Get, Param, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GenerationService } from './generation.service';

@Controller('generation')
@UseGuards(JwtAuthGuard)
export class GenerationController {
  constructor(private generationService: GenerationService) {}

  @Post('text-to-image')
  async textToImage(@Request() req, @Body() body: { prompt: string }) {
    return this.generationService.createGeneration(
      req.user.id,
      'text-to-image',
      body.prompt,
    );
  }

  @Post('image-to-image')
  @UseInterceptors(FileInterceptor('image'))
  async imageToImage(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { prompt: string },
  ) {
    return this.generationService.createGeneration(
      req.user.id,
      'image-to-image',
      body.prompt,
      file,
    );
  }

  @Post('image-to-video')
  @UseInterceptors(FileInterceptor('image'))
  async imageToVideo(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { prompt?: string },
  ) {
    return this.generationService.createGeneration(
      req.user.id,
      'image-to-video',
      body.prompt,
      file,
    );
  }

  @Post('text-to-speech')
  async textToSpeech(@Request() req, @Body() body: { text: string }) {
    return this.generationService.createGeneration(
      req.user.id,
      'text-to-speech',
      body.text,
    );
  }

  @Get('history')
  async getHistory(@Request() req) {
    return this.generationService.getUserGenerations(req.user.id);
  }

  @Get(':id')
  async getGeneration(@Request() req, @Param('id') id: string) {
    return this.generationService.getGeneration(id, req.user.id);
  }
}
