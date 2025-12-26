import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from './gemini.service';
import { CloudinaryService } from './cloudinary.service';
import axios from 'axios';

@Processor('generation')
export class GenerationProcessor {
  constructor(
    private prisma: PrismaService,
    private gemini: GeminiService,
    private cloudinary: CloudinaryService,
  ) {}

  private async downloadImageAsBase64(url: string): Promise<string> {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');
    return buffer.toString('base64');
  }

  @Process('process')
  async handleGeneration(job: Job) {
    const { generationId, type, prompt, inputUrl } = job.data;

    console.log('🚀 [Processor] Starting generation job');
    console.log('📋 [Processor] Job ID:', job.id);
    console.log('🔖 [Processor] Generation ID:', generationId);
    console.log('🎯 [Processor] Type:', type);
    console.log('📝 [Processor] Prompt:', prompt);
    console.log('🔗 [Processor] Input URL:', inputUrl);

    try {
      await this.prisma.generation.update({
        where: { id: generationId },
        data: { status: 'processing' },
      });
      console.log('✅ [Processor] Status updated to processing');

      let outputUrl: string;

      switch (type) {
        case 'text-to-image':
          console.log('🎨 [Processor] Processing text-to-image...');
          const imageBase64 = await this.gemini.generateImage(prompt);
          console.log('✅ [Processor] Image generated, uploading to Cloudinary...');
          
          // Add data URI prefix for Cloudinary
          const imageDataUri = `data:image/png;base64,${imageBase64}`;
          outputUrl = await this.cloudinary.uploadBase64(imageDataUri, 'image');
          console.log('✅ [Processor] Uploaded to Cloudinary:', outputUrl);
          break;

        case 'image-to-image':
          console.log('✏️  [Processor] Processing image-to-image...');
          // Download image dari Cloudinary dan convert ke base64
          const inputImageBase64 = await this.downloadImageAsBase64(inputUrl);
          console.log('✅ [Processor] Downloaded input image');
          
          const editedImageBase64 = await this.gemini.editImage(inputImageBase64, prompt);
          console.log('✅ [Processor] Image edited, uploading to Cloudinary...');
          
          const editedDataUri = `data:image/png;base64,${editedImageBase64}`;
          outputUrl = await this.cloudinary.uploadBase64(editedDataUri, 'image');
          console.log('✅ [Processor] Uploaded to Cloudinary:', outputUrl);
          break;

        case 'image-to-video':
          console.log('🎬 [Processor] Processing image-to-video...');
          const videoData = await this.gemini.generateVideo(inputUrl, prompt);
          outputUrl = await this.cloudinary.uploadBase64(videoData, 'video');
          break;

        case 'text-to-speech':
          console.log('🎤 [Processor] Processing text-to-speech...');
          const audioBuffer = await this.gemini.textToSpeech(prompt);
          outputUrl = await this.cloudinary.uploadBuffer(audioBuffer, 'raw');
          break;

        default:
          throw new Error('Invalid generation type');
      }

      console.log('💾 [Processor] Updating database with result...');
      await this.prisma.generation.update({
        where: { id: generationId },
        data: {
          status: 'completed',
          outputUrl,
        },
      });

      console.log('✅ [Processor] Generation completed successfully!');
      return { success: true, outputUrl };
    } catch (error) {
      console.error('💥 [Processor] Error in generation:', error);
      console.error('📊 [Processor] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });

      await this.prisma.generation.update({
        where: { id: generationId },
        data: {
          status: 'failed',
          metadata: { error: error.message, stack: error.stack },
        },
      });

      throw error;
    }
  }
}
