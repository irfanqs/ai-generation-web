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
import { IsString, IsOptional } from 'class-validator';

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

class AutoGenerateScenesDto {
  @IsString()
  imageBase64: string;

  @IsOptional()
  @IsString()
  additionalPrompt?: string;

  @IsOptional()
  @IsString()
  language?: string;
}

class GenerateSceneImageDto {
  @IsString()
  referenceImageBase64: string;

  @IsString()
  visualPrompt: string;

  @IsOptional()
  sceneNumber?: number;

  @IsOptional()
  @IsString()
  aspectRatio?: string;
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
    console.log('🎬 [VeoController] auto-generate-scenes called');
    console.log('📊 [VeoController] imageBase64 exists:', !!dto.imageBase64);
    console.log('📊 [VeoController] imageBase64 length:', dto.imageBase64?.length || 0);
    console.log('📊 [VeoController] additionalPrompt:', dto.additionalPrompt);
    
    const userId = req.user.id;
    const apiKey = await this.getUserApiKey(userId);

    if (!dto.imageBase64) {
      console.log('❌ [VeoController] No imageBase64 in request body');
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
      
      const languageInstruction = dto.language === 'en' 
        ? 'Write all scripts in natural conversational English - as if someone is actually speaking to camera.' 
        : 'Write all scripts in natural conversational Indonesian (Bahasa Indonesia) - seperti orang berbicara langsung ke kamera.';
      
      const prompt = `You are an expert video advertisement scriptwriter. Analyze this reference image carefully - this is the PRODUCT that will be featured in ALL scenes.

TASK: Create 4 video scene prompts for a marketing video advertisement. 

${dto.additionalPrompt ? `ADDITIONAL CONTEXT: ${dto.additionalPrompt}` : ''}

SCRIPT WRITING RULES - VERY IMPORTANT:
- ${languageInstruction}
- Scripts are SPOKEN DIALOGUE - what the person in the video will actually SAY
- Write like natural speech, NOT formal writing
- Use casual, relatable language that connects with viewers
- All 4 scripts must FLOW together as ONE continuous story
- Each script should naturally lead to the next scene
- Keep each script 1-2 short sentences (5-15 words max)
- Use "kamu/kita" not "Anda" for Indonesian, use "you/we" for English

VISUAL RULES:
- EVERY scene MUST include a PERSON (human) doing an ACTION with the product
- The product from the reference image must appear in every scene
- Show real human emotions and interactions

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{
  "productName": "Detected product name",
  "scenes": [
    {
      "name": "Hook",
      "description": "Grab viewer attention",
      "script": "Casual hook question or statement that grabs attention - spoken naturally like talking to a friend",
      "visualPrompt": "A person looking excited/curious at camera, holding or reaching for [PRODUCT]. Close-up shot, dramatic lighting. Action: person making eye contact with camera, intrigued expression."
    },
    {
      "name": "Problem", 
      "description": "Show the problem",
      "script": "Relatable complaint about the problem - casual, frustrated tone like venting to a friend",
      "visualPrompt": "Same person looking frustrated/tired with a common problem. Medium shot showing frustration. Slightly dim lighting. Action: person sighing or showing struggle."
    },
    {
      "name": "Solution",
      "description": "Product as solution", 
      "script": "Excited discovery of solution - happy, relieved tone like sharing good news",
      "visualPrompt": "Same person happily using [PRODUCT], smiling with satisfaction. Bright warm lighting. Action: person using product with genuine smile."
    },
    {
      "name": "CTA",
      "description": "Call to Action",
      "script": "Friendly invitation to try - casual recommendation like telling a friend",
      "visualPrompt": "Same person confidently holding [PRODUCT] towards camera, friendly gesture. Professional lighting. Action: person presenting product with thumbs up or nod."
    }
  ]
}

EXAMPLE SCRIPTS (Indonesian):
- Hook: "Eh, tau gak sih masalah yang sering banget aku alami?"
- Problem: "Capek banget deh tiap hari harus begini terus..."
- Solution: "Tapi semenjak pake ini, beda banget rasanya!"
- CTA: "Cobain deh, dijamin gak nyesel!"

EXAMPLE SCRIPTS (English):
- Hook: "You know what really bugs me every single day?"
- Problem: "I'm so tired of dealing with this problem..."
- Solution: "But ever since I found this, everything changed!"
- CTA: "Seriously, you gotta try this!"

Replace [PRODUCT] with the actual product from the reference image.`;

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

  /**
   * Generate scene image based on reference image and visual prompt
   * Uses Gemini image generation with reference for consistency
   */
  @Post('generate-scene-image')
  async generateSceneImage(@Request() req, @Body() dto: GenerateSceneImageDto) {
    console.log('🖼️ [VeoController] generate-scene-image called');
    console.log('📊 [VeoController] sceneNumber:', dto.sceneNumber);
    console.log('📊 [VeoController] visualPrompt length:', dto.visualPrompt?.length || 0);
    console.log('📊 [VeoController] referenceImageBase64 length:', dto.referenceImageBase64?.length || 0);
    
    const userId = req.user.id;
    const apiKey = await this.getUserApiKey(userId);

    if (!dto.referenceImageBase64) {
      throw new HttpException('Reference image is required', HttpStatus.BAD_REQUEST);
    }

    if (!dto.visualPrompt) {
      throw new HttpException('Visual prompt is required', HttpStatus.BAD_REQUEST);
    }

    // Cost: 4 credits per scene image
    const creditCost = 4;
    const hasCredits = await this.generationService.checkAndDeductCredits(userId, creditCost);
    if (!hasCredits) {
      throw new HttpException('Insufficient credits. Need 4 credits.', HttpStatus.PAYMENT_REQUIRED);
    }

    try {
      const axios = require('axios');
      
      // Determine aspect ratio description for prompt
      const aspectRatioDesc = dto.aspectRatio === '9:16' ? 'PORTRAIT orientation (9:16 vertical)' 
        : dto.aspectRatio === '1:1' ? 'SQUARE format (1:1)'
        : dto.aspectRatio === '4:5' ? 'INSTAGRAM format (4:5 vertical)'
        : 'LANDSCAPE orientation (16:9 horizontal)';
      
      // Enhanced prompt with PERSON + ACTION + ASPECT RATIO requirement
      const prompt = `You are a professional advertising photographer. Create a NEW image for Scene ${dto.sceneNumber || 'next'} of a video advertisement.

REFERENCE IMAGE: This shows the PRODUCT that must appear in the new image.

IMAGE FORMAT: ${aspectRatioDesc} - compose the image accordingly!

SCENE TO CREATE:
${dto.visualPrompt}

CRITICAL REQUIREMENTS:
1. ASPECT RATIO: Generate image in ${aspectRatioDesc} format
2. MUST INCLUDE A PERSON: The image MUST show a real human person interacting with the product
3. ACTION REQUIRED: The person must be DOING something with the product (holding, using, presenting, reacting)
4. PRODUCT VISIBILITY: The product from the reference image must be clearly visible
5. HUMAN EMOTION: Show genuine facial expression matching the scene mood
6. PROFESSIONAL QUALITY: Advertising-grade photography, good lighting, sharp focus

COMPOSITION GUIDELINES:
- Person should be the main subject, with product prominently featured
- Natural pose and authentic expression
- Clean, professional background
- Good lighting on both person and product
- Frame the shot for ${aspectRatioDesc}

DO NOT create:
- Static product-only shots without people
- Unrealistic or artificial-looking scenes
- Blurry or low-quality images
- Wrong aspect ratio

OUTPUT: Generate a single high-quality ${aspectRatioDesc} advertising image showing a PERSON actively interacting with the product.`;

      const url = `${this.baseUrl}/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
      
      const response = await axios.post(url, {
        contents: [{
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: dto.referenceImageBase64,
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 8192,
          responseModalities: ['TEXT', 'IMAGE'],
        }
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 90000,
      });

      console.log('📝 [VeoController] Generate scene image response received');

      // Extract image from response
      let imageBase64 = null;
      
      if (response.data.candidates && response.data.candidates[0]) {
        const candidate = response.data.candidates[0];
        
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.data) {
              imageBase64 = part.inlineData.data;
              console.log('🖼️ [VeoController] Image data found!');
              break;
            }
          }
        }
      }

      if (!imageBase64) {
        // Fallback: Try with imagen model
        console.log('⚠️ [VeoController] No image in response, trying imagen model...');
        
        const imagenUrl = `${this.baseUrl}/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
        
        // Map aspect ratio to Imagen format
        let imagenAspectRatio = '3:4'; // default portrait
        if (dto.aspectRatio === '16:9') imagenAspectRatio = '16:9';
        else if (dto.aspectRatio === '9:16') imagenAspectRatio = '9:16';
        else if (dto.aspectRatio === '1:1') imagenAspectRatio = '1:1';
        else if (dto.aspectRatio === '4:5') imagenAspectRatio = '4:5';
        
        // Enhanced prompt for Imagen with PERSON + ACTION
        const imagenPrompt = `Professional advertising photograph showing a PERSON interacting with a product. ${dto.visualPrompt}. 
The image must show: a real human person actively using or holding the product, genuine facial expression, professional lighting.
Style: Modern advertising photography, lifestyle shot with human subject.
Quality: 8K, ultra sharp, commercial advertising grade.`;
        
        const imagenResponse = await axios.post(imagenUrl, {
          instances: [{
            prompt: imagenPrompt,
          }],
          parameters: {
            sampleCount: 1,
            aspectRatio: imagenAspectRatio,
            safetyFilterLevel: 'block_few',
          }
        }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 90000,
        });

        if (imagenResponse.data.predictions && imagenResponse.data.predictions[0]) {
          imageBase64 = imagenResponse.data.predictions[0].bytesBase64Encoded;
          console.log('🖼️ [VeoController] Image generated via Imagen!');
        }
      }

      if (!imageBase64) {
        throw new Error('Failed to generate scene image');
      }

      return {
        success: true,
        imageBase64,
        sceneNumber: dto.sceneNumber,
        creditCost,
      };
    } catch (error: any) {
      // Refund credits on failure
      await this.generationService.refundCredits(userId, creditCost);
      console.error('💥 [VeoController] Generate scene image error:', error.message);
      if (error.response) {
        console.error('📊 [VeoController] Error response:', error.response.status, JSON.stringify(error.response.data).substring(0, 500));
      }
      throw new HttpException(error.message || 'Failed to generate scene image', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
