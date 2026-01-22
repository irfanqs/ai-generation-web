import { Injectable } from '@nestjs/common';
import { GoogleGenAI, VideoGenerationReferenceType } from '@google/genai';
import * as fs from 'fs';

export interface VeoConfig {
  aspectRatio?: '16:9' | '9:16';
  resolution?: '720p' | '1080p';
  durationSeconds?: 4 | 6 | 8;
  negativePrompt?: string;
}

export interface VideoExtensionConfig {
  prompt?: string;
  maxExtensions?: number;
}

export interface ReferenceImage {
  imageBase64: string;
  referenceType: 'asset' | 'style';
}

export interface InterpolationConfig {
  firstFrameBase64: string;
  lastFrameBase64: string;
  prompt?: string;
}

@Injectable()
export class VeoService {
  static readonly MODELS = {
    VEO_3_1: 'veo-3.1-generate-preview',
    VEO_3_1_FAST: 'veo-3.1-fast-generate-preview',
    VEO_3: 'veo-3.0-generate-001',
    VEO_3_FAST: 'veo-3.0-fast-generate-001',
    VEO_2: 'veo-2.0-generate-001',
  };

  constructor() {
    console.log('✅ [VeoService] Initialized (user API key mode)');
  }

  private getAI(apiKey: string): GoogleGenAI {
    return new GoogleGenAI({ apiKey });
  }

  private parseBase64Image(imageBase64: string): { data: string; mimeType: string } {
    if (!imageBase64) {
      throw new Error('Image base64 data is required');
    }
    
    let cleanBase64 = imageBase64;
    let mimeType = 'image/jpeg';
    
    if (typeof imageBase64 === 'string' && imageBase64.includes(',')) {
      const parts = imageBase64.split(',');
      cleanBase64 = parts[1];
      const mimeMatch = parts[0].match(/data:([^;]+)/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
      }
    } else if (typeof imageBase64 === 'string') {
      if (imageBase64.startsWith('/9j/')) {
        mimeType = 'image/jpeg';
      } else if (imageBase64.startsWith('iVBOR')) {
        mimeType = 'image/png';
      }
    }
    
    return { data: cleanBase64, mimeType };
  }

  async textToVideo(
    prompt: string,
    apiKey: string,
    config?: VeoConfig,
    model: string = VeoService.MODELS.VEO_3_1,
  ): Promise<{ videoBase64: string; operationName: string }> {
    console.log('🎬 [VeoService] Text-to-Video generation...');
    
    if (!apiKey) throw new Error('Gemini API key is required');

    try {
      const ai = this.getAI(apiKey);
      
      let operation = await ai.models.generateVideos({
        model,
        prompt,
        config: {
          aspectRatio: config?.aspectRatio || '16:9',
          negativePrompt: config?.negativePrompt,
        },
      });

      console.log('✅ [VeoService] Operation started:', operation.name);
      operation = await this.pollOperation(ai, operation);
      const videoBase64 = await this.downloadVideo(ai, apiKey, operation);

      return { videoBase64, operationName: operation.name };
    } catch (error: any) {
      console.error('💥 [VeoService] Text-to-Video error:', error.message);
      throw error;
    }
  }

  async imageToVideo(
    imageBase64: string,
    prompt: string,
    apiKey: string,
    config?: VeoConfig,
    model: string = VeoService.MODELS.VEO_3_1,
  ): Promise<{ videoBase64: string; operationName: string }> {
    console.log('🎬 [VeoService] Image-to-Video generation...');
    
    if (!apiKey) throw new Error('Gemini API key is required');
    if (!imageBase64) throw new Error('imageBase64 is required');

    try {
      const ai = this.getAI(apiKey);
      const { data: cleanBase64, mimeType } = this.parseBase64Image(imageBase64);

      let operation = await ai.models.generateVideos({
        model,
        prompt,
        image: {
          imageBytes: cleanBase64,
          mimeType: mimeType,
        },
        config: {
          aspectRatio: config?.aspectRatio || '16:9',
          negativePrompt: config?.negativePrompt,
        },
      });

      console.log('✅ [VeoService] Operation started:', operation.name);
      operation = await this.pollOperation(ai, operation);
      const videoBase64 = await this.downloadVideo(ai, apiKey, operation);

      return { videoBase64, operationName: operation.name };
    } catch (error: any) {
      console.error('💥 [VeoService] Image-to-Video error:', error.message);
      throw error;
    }
  }

  async videoWithReferences(
    prompt: string,
    referenceImages: ReferenceImage[],
    apiKey: string,
    config?: VeoConfig,
  ): Promise<{ videoBase64: string; operationName: string }> {
    console.log('🎬 [VeoService] Video with References generation...');
    
    if (!apiKey) throw new Error('Gemini API key is required');
    if (referenceImages.length > 3) throw new Error('Maximum 3 reference images allowed');

    try {
      const ai = this.getAI(apiKey);
      
      const references = referenceImages.map((ref) => {
        const { data, mimeType } = this.parseBase64Image(ref.imageBase64);
        return {
          image: { imageBytes: data, mimeType },
          referenceType: ref.referenceType === 'asset' 
            ? VideoGenerationReferenceType.ASSET 
            : VideoGenerationReferenceType.STYLE,
        };
      });

      let operation = await ai.models.generateVideos({
        model: VeoService.MODELS.VEO_3_1,
        prompt,
        config: {
          aspectRatio: config?.aspectRatio || '16:9',
          negativePrompt: config?.negativePrompt,
          referenceImages: references,
          durationSeconds: 8,
        },
      });

      console.log('✅ [VeoService] Operation started:', operation.name);
      operation = await this.pollOperation(ai, operation);
      const videoBase64 = await this.downloadVideo(ai, apiKey, operation);

      return { videoBase64, operationName: operation.name };
    } catch (error: any) {
      console.error('💥 [VeoService] Video with References error:', error.message);
      throw error;
    }
  }

  async interpolateVideo(
    interpolation: InterpolationConfig,
    apiKey: string,
    config?: VeoConfig,
  ): Promise<{ videoBase64: string; operationName: string }> {
    console.log('🎬 [VeoService] Interpolation video generation...');
    
    if (!apiKey) throw new Error('Gemini API key is required');

    try {
      const ai = this.getAI(apiKey);
      const firstFrame = this.parseBase64Image(interpolation.firstFrameBase64);
      const lastFrame = this.parseBase64Image(interpolation.lastFrameBase64);
      
      let operation = await ai.models.generateVideos({
        model: VeoService.MODELS.VEO_3_1,
        prompt: interpolation.prompt || 'Smooth transition between frames',
        image: { imageBytes: firstFrame.data, mimeType: firstFrame.mimeType },
        config: {
          aspectRatio: config?.aspectRatio || '16:9',
          negativePrompt: config?.negativePrompt,
          lastFrame: { imageBytes: lastFrame.data, mimeType: lastFrame.mimeType },
          durationSeconds: 8,
        },
      });

      console.log('✅ [VeoService] Operation started:', operation.name);
      operation = await this.pollOperation(ai, operation);
      const videoBase64 = await this.downloadVideo(ai, apiKey, operation);

      return { videoBase64, operationName: operation.name };
    } catch (error: any) {
      console.error('💥 [VeoService] Interpolation error:', error.message);
      throw error;
    }
  }

  async extendVideo(
    videoBase64: string,
    extensionConfig: VideoExtensionConfig,
    apiKey: string,
  ): Promise<{ videoBase64: string; totalDuration: number; operationName: string }> {
    console.log('🎬 [VeoService] Video extension...');
    
    if (!apiKey) throw new Error('Gemini API key is required');

    try {
      const ai = this.getAI(apiKey);
      const tempPath = `/tmp/extend-input-${Date.now()}.mp4`;
      fs.writeFileSync(tempPath, Buffer.from(videoBase64, 'base64'));

      const uploadedFile = await ai.files.upload({
        file: tempPath,
        config: { mimeType: 'video/mp4' },
      });

      fs.unlinkSync(tempPath);

      let operation = await ai.models.generateVideos({
        model: VeoService.MODELS.VEO_3_1,
        prompt: extensionConfig.prompt || 'Continue the video smoothly',
        video: uploadedFile,
        config: { durationSeconds: 8 },
      });

      console.log('✅ [VeoService] Extension operation started:', operation.name);
      operation = await this.pollOperation(ai, operation);
      const extendedVideoBase64 = await this.downloadVideo(ai, apiKey, operation);

      return {
        videoBase64: extendedVideoBase64,
        totalDuration: 15,
        operationName: operation.name,
      };
    } catch (error: any) {
      console.error('💥 [VeoService] Video extension error:', error.message);
      throw error;
    }
  }

  async generateLongVideo(
    initialPrompt: string,
    segments: { prompt: string }[],
    apiKey: string,
    referenceImages?: ReferenceImage[],
    config?: VeoConfig,
  ): Promise<{
    finalVideoBase64: string;
    segmentCount: number;
    totalDuration: number;
    segmentUrls: string[];
  }> {
    console.log('🎬 [VeoService] Long Video Flow generation...');
    
    if (!apiKey) throw new Error('Gemini API key is required');
    if (segments.length > 19) throw new Error('Maximum 19 extension segments');

    const segmentUrls: string[] = [];
    let currentVideoBase64: string;
    let totalDuration = 0;

    try {
      if (referenceImages && referenceImages.length > 0) {
        const initial = await this.videoWithReferences(initialPrompt, referenceImages, apiKey, config);
        currentVideoBase64 = initial.videoBase64;
      } else {
        const initial = await this.textToVideo(initialPrompt, apiKey, config);
        currentVideoBase64 = initial.videoBase64;
      }

      totalDuration = 8;
      segmentUrls.push(`segment-0-initial`);

      for (let i = 0; i < segments.length; i++) {
        console.log(`🎬 [VeoService] Generating segment ${i + 1}/${segments.length}...`);
        
        const extension = await this.extendVideo(currentVideoBase64, { prompt: segments[i].prompt }, apiKey);
        currentVideoBase64 = extension.videoBase64;
        totalDuration += 7;
        segmentUrls.push(`segment-${i + 1}`);

        if (totalDuration >= 148) break;
      }

      return {
        finalVideoBase64: currentVideoBase64,
        segmentCount: segmentUrls.length,
        totalDuration,
        segmentUrls,
      };
    } catch (error: any) {
      console.error('💥 [VeoService] Long video generation error:', error.message);
      throw error;
    }
  }

  private async pollOperation(ai: GoogleGenAI, operation: any, maxAttempts: number = 120): Promise<any> {
    let attempts = 0;

    while (!operation.done && attempts < maxAttempts) {
      attempts++;
      console.log(`⏳ [VeoService] Polling attempt ${attempts}/${maxAttempts}...`);
      await new Promise((resolve) => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation });
    }

    if (!operation.done) {
      console.error('❌ [VeoService] Operation timed out');
      throw new Error(`Video generation timeout after ${maxAttempts * 10} seconds`);
    }

    // Log the full response for debugging
    console.log('📊 [VeoService] Operation done:', operation.done);
    console.log('📊 [VeoService] Operation response:', JSON.stringify(operation.response || {}).substring(0, 500));
    
    // Check for errors in the operation
    if (operation.error) {
      console.error('❌ [VeoService] Operation error:', operation.error);
      throw new Error(`Video generation failed: ${operation.error.message || JSON.stringify(operation.error)}`);
    }

    // Check if video was generated
    if (!operation.response) {
      console.error('❌ [VeoService] No response in operation');
      throw new Error('No response from video generation');
    }

    if (!operation.response.generatedVideos || operation.response.generatedVideos.length === 0) {
      console.error('❌ [VeoService] No generatedVideos in response');
      console.error('📊 [VeoService] Full response:', JSON.stringify(operation.response));
      
      // Check if there's a reason for failure
      if (operation.response.raiMediaFilteredCount > 0) {
        throw new Error('Video was filtered due to content policy. Try a different prompt.');
      }
      
      throw new Error('No video generated - the content may have been filtered or generation failed');
    }

    console.log('✅ [VeoService] Video generated successfully');
    return operation;
  }

  private async downloadVideo(ai: GoogleGenAI, apiKey: string, operation: any): Promise<string> {
    const videoFile = operation.response.generatedVideos[0].video;
    console.log('📥 [VeoService] Downloading video...');

    try {
      const tempPath = `/tmp/veo-video-${Date.now()}.mp4`;
      await ai.files.download({ file: videoFile, downloadPath: tempPath });
      const videoBuffer = fs.readFileSync(tempPath);
      const videoBase64 = videoBuffer.toString('base64');
      fs.unlinkSync(tempPath);
      return videoBase64;
    } catch (error: any) {
      const axios = require('axios');
      const response = await axios.get(videoFile.uri, {
        responseType: 'arraybuffer',
        timeout: 120000,
        params: { key: apiKey },
      });
      return Buffer.from(response.data).toString('base64');
    }
  }

  getModelsInfo() {
    return {
      models: VeoService.MODELS,
      recommended: VeoService.MODELS.VEO_3_1,
      features: {
        [VeoService.MODELS.VEO_3_1]: { audio: true, extension: true, referenceImages: true, interpolation: true, maxDuration: 148 },
        [VeoService.MODELS.VEO_3_1_FAST]: { audio: true, extension: true, referenceImages: true, interpolation: true, maxDuration: 148 },
        [VeoService.MODELS.VEO_3]: { audio: true, extension: false, referenceImages: false, interpolation: false, maxDuration: 8 },
        [VeoService.MODELS.VEO_2]: { audio: false, extension: false, referenceImages: false, interpolation: false, maxDuration: 8 },
      },
    };
  }
}
