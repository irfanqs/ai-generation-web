import { Controller, Post, Body, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnimationService, CharacterDNA, Scene } from './animation.service';
import { CloudinaryService } from './cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';

interface ScanDNADto {
  imageBase64: string;
}

interface GenerateScenesDto {
  storyTitle: string;
  characterName: string;
  characterDNA: CharacterDNA;
  artStyle: string;
  sceneCount?: number;
}

interface GeneratePreviewDto {
  scene: Scene;
  characterDNA: CharacterDNA;
  characterImageBase64: string;
  artStyle: string;
  aspectRatio: string;
}

interface GenerateVideoDto {
  imageUrl: string;
  scene: Scene;
  artStyle: string;
}

@Controller('animation')
@UseGuards(JwtAuthGuard)
export class AnimationController {
  constructor(
    private animationService: AnimationService,
    private cloudinaryService: CloudinaryService,
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

  @Post('scan-dna')
  async scanDNA(@Request() req, @Body() dto: ScanDNADto) {
    const userId = req.user.id;
    const apiKey = await this.getUserApiKey(userId);
    
    if (!dto.imageBase64) {
      throw new HttpException('Image is required', HttpStatus.BAD_REQUEST);
    }

    const hasCredits = await this.animationService.deductCredits(userId, 2, 'DNA Scan');
    if (!hasCredits) {
      throw new HttpException('Insufficient credits. Need 2 credits for DNA scan.', HttpStatus.PAYMENT_REQUIRED);
    }

    try {
      const characterDNA = await this.animationService.scanCharacterDNA(dto.imageBase64, apiKey);
      const imageDataUri = `data:image/jpeg;base64,${dto.imageBase64}`;
      const characterImageUrl = await this.cloudinaryService.uploadBase64(imageDataUri, 'image');
      
      return { success: true, characterDNA, characterImageUrl };
    } catch (error: any) {
      throw new HttpException(error.message || 'Failed to scan character DNA', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('generate-scenes')
  async generateScenes(@Request() req, @Body() dto: GenerateScenesDto) {
    const userId = req.user.id;
    const apiKey = await this.getUserApiKey(userId);
    
    if (!dto.storyTitle || !dto.characterName || !dto.characterDNA) {
      throw new HttpException('Story title, character name, and character DNA are required', HttpStatus.BAD_REQUEST);
    }

    const hasCredits = await this.animationService.deductCredits(userId, 5, 'Scene Generation');
    if (!hasCredits) {
      throw new HttpException('Insufficient credits. Need 5 credits for scene generation.', HttpStatus.PAYMENT_REQUIRED);
    }

    try {
      const scenes = await this.animationService.generateStoryScenes(
        dto.storyTitle,
        dto.characterName,
        dto.characterDNA,
        dto.artStyle,
        apiKey,
        dto.sceneCount || 4
      );
      
      return { success: true, scenes };
    } catch (error: any) {
      throw new HttpException(error.message || 'Failed to generate scenes', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('generate-preview')
  async generatePreview(@Request() req, @Body() dto: GeneratePreviewDto) {
    const userId = req.user.id;
    const apiKey = await this.getUserApiKey(userId);
    
    if (!dto.scene || !dto.characterDNA || !dto.characterImageBase64) {
      throw new HttpException('Scene, character DNA, and character image are required', HttpStatus.BAD_REQUEST);
    }

    const hasCredits = await this.animationService.deductCredits(userId, 4, 'Scene Preview');
    if (!hasCredits) {
      throw new HttpException('Insufficient credits. Need 4 credits for scene preview.', HttpStatus.PAYMENT_REQUIRED);
    }

    try {
      const previewUrl = await this.animationService.generateScenePreview(
        dto.scene,
        dto.characterDNA,
        dto.characterImageBase64,
        dto.artStyle,
        dto.aspectRatio,
        apiKey
      );
      
      return { success: true, previewUrl };
    } catch (error: any) {
      throw new HttpException(error.message || 'Failed to generate preview', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('generate-video')
  async generateVideo(@Request() req, @Body() dto: GenerateVideoDto) {
    const userId = req.user.id;
    const apiKey = await this.getUserApiKey(userId);
    
    if (!dto.imageUrl || !dto.scene) {
      throw new HttpException('Image URL and scene are required', HttpStatus.BAD_REQUEST);
    }

    const hasCredits = await this.animationService.deductCredits(userId, 10, 'Scene Video');
    if (!hasCredits) {
      throw new HttpException('Insufficient credits. Need 10 credits for video generation.', HttpStatus.PAYMENT_REQUIRED);
    }

    try {
      const videoUrl = await this.animationService.generateSceneVideo(
        dto.imageUrl,
        dto.scene,
        dto.artStyle,
        apiKey
      );
      
      return { success: true, videoUrl };
    } catch (error: any) {
      throw new HttpException(error.message || 'Failed to generate video', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
