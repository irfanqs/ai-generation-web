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
  maxExtensions?: number; // Max 20 extensions = 148 seconds total
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
  private ai: GoogleGenAI;
  private apiKey: string;

  // Available Veo models
  static readonly MODELS = {
    VEO_3_1: 'veo-3.1-generate-preview',
    VEO_3_1_FAST: 'veo-3.1-fast-generate-preview',
    VEO_3: 'veo-3.0-generate-001',
    VEO_3_FAST: 'veo-3.0-fast-generate-001',
    VEO_2: 'veo-2.0-generate-001',
  };

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    console.log('✅ [VeoService] Initialized with Veo 3.1');
  }

  /**
   * Helper to clean base64 and detect mime type
   */
  private parseBase64Image(imageBase64: string): { data: string; mimeType: string } {
    // Handle undefined or null
    if (!imageBase64) {
      throw new Error('Image base64 data is required');
    }
    
    let cleanBase64 = imageBase64;
    let mimeType = 'image/jpeg';
    
    if (typeof imageBase64 === 'string' && imageBase64.includes(',')) {
      // Has data URI prefix
      const parts = imageBase64.split(',');
      cleanBase64 = parts[1];
      
      // Extract mime type from prefix
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

  /**
   * Generate video from text prompt
   */
  async textToVideo(
    prompt: string,
    config?: VeoConfig,
    model: string = VeoService.MODELS.VEO_3_1,
  ): Promise<{ videoBase64: string; operationName: string }> {
    console.log('🎬 [VeoService] Text-to-Video generation...');
    console.log('📝 [VeoService] Prompt:', prompt);
    console.log('⚙️ [VeoService] Config:', config);
    console.log('🤖 [VeoService] Model:', model);

    try {
      let operation = await this.ai.models.generateVideos({
        model,
        prompt,
        config: {
          aspectRatio: config?.aspectRatio || '16:9',
          negativePrompt: config?.negativePrompt,
        },
      });

      console.log('✅ [VeoService] Operation started:', operation.name);

      // Poll for completion
      operation = await this.pollOperation(operation);

      // Download video
      const videoBase64 = await this.downloadVideo(operation);

      return {
        videoBase64,
        operationName: operation.name,
      };
    } catch (error: any) {
      console.error('💥 [VeoService] Text-to-Video error:', error.message);
      throw error;
    }
  }

  /**
   * Generate video from image (Image-to-Video)
   */
  async imageToVideo(
    imageBase64: string,
    prompt: string,
    config?: VeoConfig,
    model: string = VeoService.MODELS.VEO_3_1,
  ): Promise<{ videoBase64: string; operationName: string }> {
    console.log('🎬 [VeoService] Image-to-Video generation...');
    console.log('📝 [VeoService] Prompt:', prompt);
    console.log('🖼️ [VeoService] imageBase64 type:', typeof imageBase64);
    console.log('🖼️ [VeoService] imageBase64 exists:', !!imageBase64);
    console.log('🖼️ [VeoService] imageBase64 length:', imageBase64?.length || 0);

    if (!imageBase64) {
      throw new Error('imageBase64 is required for image-to-video generation');
    }

    try {
      const { data: cleanBase64, mimeType } = this.parseBase64Image(imageBase64);
      console.log('🖼️ [VeoService] Image mime type:', mimeType);
      console.log('🖼️ [VeoService] Clean base64 length:', cleanBase64.length);

      let operation = await this.ai.models.generateVideos({
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

      operation = await this.pollOperation(operation);
      const videoBase64 = await this.downloadVideo(operation);

      return {
        videoBase64,
        operationName: operation.name,
      };
    } catch (error: any) {
      console.error('💥 [VeoService] Image-to-Video error:', error.message);
      throw error;
    }
  }

  /**
   * Generate video with reference images for consistency
   * Supports up to 3 reference images
   */
  async videoWithReferences(
    prompt: string,
    referenceImages: ReferenceImage[],
    config?: VeoConfig,
  ): Promise<{ videoBase64: string; operationName: string }> {
    console.log('🎬 [VeoService] Video with References generation...');
    console.log('📝 [VeoService] Prompt:', prompt);
    console.log('🖼️ [VeoService] Reference images:', referenceImages.length);

    if (referenceImages.length > 3) {
      throw new Error('Maximum 3 reference images allowed');
    }

    try {
      const references = referenceImages.map((ref) => {
        const { data, mimeType } = this.parseBase64Image(ref.imageBase64);
        return {
          image: {
            imageBytes: data,
            mimeType: mimeType,
          },
          referenceType: ref.referenceType === 'asset' 
            ? VideoGenerationReferenceType.ASSET 
            : VideoGenerationReferenceType.STYLE,
        };
      });

      let operation = await this.ai.models.generateVideos({
        model: VeoService.MODELS.VEO_3_1,
        prompt,
        config: {
          aspectRatio: config?.aspectRatio || '16:9',
          negativePrompt: config?.negativePrompt,
          referenceImages: references,
          durationSeconds: 8, // Required when using reference images
        },
      });

      console.log('✅ [VeoService] Operation started:', operation.name);

      operation = await this.pollOperation(operation);
      const videoBase64 = await this.downloadVideo(operation);

      return {
        videoBase64,
        operationName: operation.name,
      };
    } catch (error: any) {
      console.error('💥 [VeoService] Video with References error:', error.message);
      throw error;
    }
  }

  /**
   * Generate video using interpolation (first and last frame)
   */
  async interpolateVideo(
    interpolation: InterpolationConfig,
    config?: VeoConfig,
  ): Promise<{ videoBase64: string; operationName: string }> {
    console.log('🎬 [VeoService] Interpolation video generation...');

    try {
      const firstFrame = this.parseBase64Image(interpolation.firstFrameBase64);
      const lastFrame = this.parseBase64Image(interpolation.lastFrameBase64);
      
      let operation = await this.ai.models.generateVideos({
        model: VeoService.MODELS.VEO_3_1,
        prompt: interpolation.prompt || 'Smooth transition between frames',
        image: {
          imageBytes: firstFrame.data,
          mimeType: firstFrame.mimeType,
        },
        config: {
          aspectRatio: config?.aspectRatio || '16:9',
          negativePrompt: config?.negativePrompt,
          lastFrame: {
            imageBytes: lastFrame.data,
            mimeType: lastFrame.mimeType,
          },
          durationSeconds: 8, // Required for interpolation
        },
      });

      console.log('✅ [VeoService] Operation started:', operation.name);

      operation = await this.pollOperation(operation);
      const videoBase64 = await this.downloadVideo(operation);

      return {
        videoBase64,
        operationName: operation.name,
      };
    } catch (error: any) {
      console.error('💥 [VeoService] Interpolation error:', error.message);
      throw error;
    }
  }

  /**
   * Extend an existing video (up to 148 seconds total)
   * Each extension adds ~7 seconds
   */
  async extendVideo(
    videoBase64: string,
    extensionConfig: VideoExtensionConfig,
  ): Promise<{ videoBase64: string; totalDuration: number; operationName: string }> {
    console.log('🎬 [VeoService] Video extension...');
    console.log('📝 [VeoService] Extension prompt:', extensionConfig.prompt);

    try {
      // Save video to temp file for upload
      const tempPath = `/tmp/extend-input-${Date.now()}.mp4`;
      fs.writeFileSync(tempPath, Buffer.from(videoBase64, 'base64'));

      // Upload video file
      const uploadedFile = await this.ai.files.upload({
        file: tempPath,
        config: { mimeType: 'video/mp4' },
      });

      console.log('✅ [VeoService] Video uploaded:', uploadedFile.name);

      // Clean up temp file
      fs.unlinkSync(tempPath);

      let operation = await this.ai.models.generateVideos({
        model: VeoService.MODELS.VEO_3_1,
        prompt: extensionConfig.prompt || 'Continue the video smoothly',
        video: uploadedFile,
        config: {
          durationSeconds: 8, // Extension always 8 seconds
        },
      });

      console.log('✅ [VeoService] Extension operation started:', operation.name);

      operation = await this.pollOperation(operation);
      const extendedVideoBase64 = await this.downloadVideo(operation);

      // Estimate total duration (original + extension)
      // Note: Actual duration calculation would need video metadata
      const estimatedDuration = 8 + 7; // Original 8s + extension 7s

      return {
        videoBase64: extendedVideoBase64,
        totalDuration: estimatedDuration,
        operationName: operation.name,
      };
    } catch (error: any) {
      console.error('💥 [VeoService] Video extension error:', error.message);
      throw error;
    }
  }

  /**
   * Generate long video by chaining multiple extensions
   * Like Google Flow - maintains consistency across segments
   */
  async generateLongVideo(
    initialPrompt: string,
    segments: { prompt: string }[],
    referenceImages?: ReferenceImage[],
    config?: VeoConfig,
  ): Promise<{
    finalVideoBase64: string;
    segmentCount: number;
    totalDuration: number;
    segmentUrls: string[];
  }> {
    console.log('🎬 [VeoService] Long Video Flow generation...');
    console.log('📝 [VeoService] Initial prompt:', initialPrompt);
    console.log('📊 [VeoService] Segments:', segments.length);

    if (segments.length > 19) {
      throw new Error('Maximum 19 extension segments (20 total including initial)');
    }

    const segmentUrls: string[] = [];
    let currentVideoBase64: string;
    let totalDuration = 0;

    try {
      // Step 1: Generate initial video with reference images for consistency
      console.log('🎬 [VeoService] Generating initial segment...');
      
      if (referenceImages && referenceImages.length > 0) {
        const initial = await this.videoWithReferences(
          initialPrompt,
          referenceImages,
          config,
        );
        currentVideoBase64 = initial.videoBase64;
      } else {
        const initial = await this.textToVideo(initialPrompt, config);
        currentVideoBase64 = initial.videoBase64;
      }

      totalDuration = 8; // Initial video is 8 seconds
      segmentUrls.push(`segment-0-initial`);
      console.log(`✅ [VeoService] Initial segment complete. Duration: ${totalDuration}s`);

      // Step 2: Extend video for each segment
      for (let i = 0; i < segments.length; i++) {
        console.log(`🎬 [VeoService] Generating segment ${i + 1}/${segments.length}...`);
        
        const extension = await this.extendVideo(currentVideoBase64, {
          prompt: segments[i].prompt,
        });

        currentVideoBase64 = extension.videoBase64;
        totalDuration += 7; // Each extension adds ~7 seconds
        segmentUrls.push(`segment-${i + 1}`);

        console.log(`✅ [VeoService] Segment ${i + 1} complete. Total duration: ${totalDuration}s`);

        // Check if we've reached max duration (148 seconds)
        if (totalDuration >= 148) {
          console.log('⚠️ [VeoService] Maximum duration reached (148s)');
          break;
        }
      }

      console.log(`🎉 [VeoService] Long video complete!`);
      console.log(`📊 [VeoService] Total segments: ${segmentUrls.length}`);
      console.log(`⏱️ [VeoService] Total duration: ${totalDuration}s`);

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

  /**
   * Poll operation until complete
   */
  private async pollOperation(operation: any, maxAttempts: number = 120): Promise<any> {
    let attempts = 0;

    while (!operation.done && attempts < maxAttempts) {
      attempts++;
      console.log(`⏳ [VeoService] Polling attempt ${attempts}/${maxAttempts}...`);
      
      await new Promise((resolve) => setTimeout(resolve, 10000)); // 10 seconds
      
      operation = await this.ai.operations.getVideosOperation({
        operation,
      });
    }

    if (!operation.done) {
      throw new Error(`Video generation timeout after ${maxAttempts * 10} seconds`);
    }

    if (!operation.response?.generatedVideos?.[0]) {
      throw new Error('No video generated');
    }

    return operation;
  }

  /**
   * Download video from operation result
   */
  private async downloadVideo(operation: any): Promise<string> {
    const videoFile = operation.response.generatedVideos[0].video;
    console.log('📥 [VeoService] Downloading video...');

    try {
      const tempPath = `/tmp/veo-video-${Date.now()}.mp4`;
      
      await this.ai.files.download({
        file: videoFile,
        downloadPath: tempPath,
      });

      const videoBuffer = fs.readFileSync(tempPath);
      const videoBase64 = videoBuffer.toString('base64');
      
      fs.unlinkSync(tempPath);

      console.log('✅ [VeoService] Video downloaded, size:', videoBase64.length);
      return videoBase64;
    } catch (error: any) {
      console.error('⚠️ [VeoService] SDK download failed, trying fallback...');
      
      // Fallback to direct URL
      const axios = require('axios');
      const response = await axios.get(videoFile.uri, {
        responseType: 'arraybuffer',
        timeout: 120000,
        params: { key: this.apiKey },
      });

      return Buffer.from(response.data).toString('base64');
    }
  }

  /**
   * Extract last frame from video for consistency in extensions
   */
  async extractLastFrame(_videoBase64: string): Promise<string> {
    // Note: This would require ffmpeg or similar
    // For now, we rely on Veo's built-in consistency
    console.log('⚠️ [VeoService] Frame extraction not implemented, using Veo consistency');
    return '';
  }

  /**
   * Get available models info
   */
  getModelsInfo() {
    return {
      models: VeoService.MODELS,
      recommended: VeoService.MODELS.VEO_3_1,
      features: {
        [VeoService.MODELS.VEO_3_1]: {
          audio: true,
          extension: true,
          referenceImages: true,
          interpolation: true,
          maxDuration: 148,
          resolutions: ['720p', '1080p'],
        },
        [VeoService.MODELS.VEO_3_1_FAST]: {
          audio: true,
          extension: true,
          referenceImages: true,
          interpolation: true,
          maxDuration: 148,
          resolutions: ['720p', '1080p'],
          note: 'Faster generation, optimized for production',
        },
        [VeoService.MODELS.VEO_3]: {
          audio: true,
          extension: false,
          referenceImages: false,
          interpolation: false,
          maxDuration: 8,
          resolutions: ['720p', '1080p'],
        },
        [VeoService.MODELS.VEO_2]: {
          audio: false,
          extension: false,
          referenceImages: false,
          interpolation: false,
          maxDuration: 8,
          resolutions: ['720p'],
        },
      },
    };
  }
}
