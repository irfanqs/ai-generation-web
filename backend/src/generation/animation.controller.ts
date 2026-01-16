import { Controller, Post, Body, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnimationService, CharacterDNA, Scene } from './animation.service';
import { CloudinaryService } from './cloudinary.service';

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
  ) {}

  // Scan character DNA from uploaded image
  @Post('scan-dna')
  async scanDNA(@Request() req, @Body() dto: ScanDNADto) {
    console.log('🔬 [AnimationController] Scan DNA request from user:', req.user.id);
    
    if (!dto.imageBase64) {
      throw new HttpException('Image is required', HttpStatus.BAD_REQUEST);
    }

    // Cost: 2 credits for DNA scan
    const hasCredits = await this.animationService.deductCredits(req.user.id, 2, 'DNA Scan');
    if (!hasCredits) {
      throw new HttpException('Insufficient credits. Need 2 credits for DNA scan.', HttpStatus.PAYMENT_REQUIRED);
    }

    try {
      const characterDNA = await this.animationService.scanCharacterDNA(dto.imageBase64);
      
      // Upload character image to Cloudinary for later use
      const imageDataUri = `data:image/jpeg;base64,${dto.imageBase64}`;
      const characterImageUrl = await this.cloudinaryService.uploadBase64(imageDataUri, 'image');
      
      return {
        success: true,
        characterDNA,
        characterImageUrl,
      };
    } catch (error: any) {
      console.error('💥 [AnimationController] Scan DNA error:', error.message);
      throw new HttpException(error.message || 'Failed to scan character DNA', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Generate story scenes from title
  @Post('generate-scenes')
  async generateScenes(@Request() req, @Body() dto: GenerateScenesDto) {
    console.log('📖 [AnimationController] Generate scenes request from user:', req.user.id);
    console.log('📝 [AnimationController] Story:', dto.storyTitle);
    
    if (!dto.storyTitle || !dto.characterName || !dto.characterDNA) {
      throw new HttpException('Story title, character name, and character DNA are required', HttpStatus.BAD_REQUEST);
    }

    // Cost: 5 credits for scene generation
    const hasCredits = await this.animationService.deductCredits(req.user.id, 5, 'Scene Generation');
    if (!hasCredits) {
      throw new HttpException('Insufficient credits. Need 5 credits for scene generation.', HttpStatus.PAYMENT_REQUIRED);
    }

    try {
      const scenes = await this.animationService.generateStoryScenes(
        dto.storyTitle,
        dto.characterName,
        dto.characterDNA,
        dto.artStyle,
        dto.sceneCount || 4
      );
      
      return {
        success: true,
        scenes,
      };
    } catch (error: any) {
      console.error('💥 [AnimationController] Generate scenes error:', error.message);
      throw new HttpException(error.message || 'Failed to generate scenes', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Generate visual preview for a single scene
  @Post('generate-preview')
  async generatePreview(@Request() req, @Body() dto: GeneratePreviewDto) {
    console.log('🎨 [AnimationController] Generate preview request from user:', req.user.id);
    console.log('🎬 [AnimationController] Scene ID:', dto.scene?.id);
    
    if (!dto.scene || !dto.characterDNA || !dto.characterImageBase64) {
      throw new HttpException('Scene, character DNA, and character image are required', HttpStatus.BAD_REQUEST);
    }

    // Cost: 4 credits per preview image
    const hasCredits = await this.animationService.deductCredits(req.user.id, 4, 'Scene Preview');
    if (!hasCredits) {
      throw new HttpException('Insufficient credits. Need 4 credits for scene preview.', HttpStatus.PAYMENT_REQUIRED);
    }

    try {
      const previewUrl = await this.animationService.generateScenePreview(
        dto.scene,
        dto.characterDNA,
        dto.characterImageBase64,
        dto.artStyle,
        dto.aspectRatio
      );
      
      return {
        success: true,
        previewUrl,
      };
    } catch (error: any) {
      console.error('💥 [AnimationController] Generate preview error:', error.message);
      throw new HttpException(error.message || 'Failed to generate preview', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Generate video from scene preview
  @Post('generate-video')
  async generateVideo(@Request() req, @Body() dto: GenerateVideoDto) {
    console.log('🎬 [AnimationController] Generate video request from user:', req.user.id);
    
    if (!dto.imageUrl || !dto.scene) {
      throw new HttpException('Image URL and scene are required', HttpStatus.BAD_REQUEST);
    }

    // Cost: 10 credits per video
    const hasCredits = await this.animationService.deductCredits(req.user.id, 10, 'Scene Video');
    if (!hasCredits) {
      throw new HttpException('Insufficient credits. Need 10 credits for video generation.', HttpStatus.PAYMENT_REQUIRED);
    }

    try {
      const videoUrl = await this.animationService.generateSceneVideo(
        dto.imageUrl,
        dto.scene,
        dto.artStyle
      );
      
      return {
        success: true,
        videoUrl,
      };
    } catch (error: any) {
      console.error('💥 [AnimationController] Generate video error:', error.message);
      throw new HttpException(error.message || 'Failed to generate video', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
