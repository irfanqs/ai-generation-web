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

  private async convertPCMtoWAV(pcmBuffer: Buffer): Promise<Buffer> {
    // Manual WAV header creation (more reliable than wav package)
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmBuffer.length;
    
    // Create WAV header (44 bytes)
    const header = Buffer.alloc(44);
    
    // RIFF chunk descriptor
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataSize, 4);
    header.write('WAVE', 8);
    
    // fmt sub-chunk
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
    header.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    
    // data sub-chunk
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);
    
    // Combine header and PCM data
    return Buffer.concat([header, pcmBuffer]);
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
          
          // Check if there's a model reference image
          const modelImageBase64 = job.data.metadata?.modelImageBuffer;
          if (modelImageBase64) {
            console.log('👤 [Processor] Model reference image provided');
          }
          
          const editedImageBase64 = await this.gemini.editImage(
            inputImageBase64, 
            prompt,
            modelImageBase64, // Pass model reference
          );
          console.log('✅ [Processor] Image edited, uploading to Cloudinary...');
          
          const editedDataUri = `data:image/png;base64,${editedImageBase64}`;
          outputUrl = await this.cloudinary.uploadBase64(editedDataUri, 'image');
          console.log('✅ [Processor] Uploaded to Cloudinary:', outputUrl);
          break;

        case 'image-to-video':
          console.log('🎬 [Processor] Processing image-to-video...');
          console.log('⚠️  [Processor] Note: This may take 1-2 minutes...');
          
          // For now, just use prompt without image (Veo text-to-video)
          // TODO: Add image input support when available
          const videoBase64 = await this.gemini.generateVideo(inputUrl, prompt);
          console.log('✅ [Processor] Video generated, uploading to Cloudinary...');
          
          const videoDataUri = `data:video/mp4;base64,${videoBase64}`;
          outputUrl = await this.cloudinary.uploadBase64(videoDataUri, 'video');
          console.log('✅ [Processor] Uploaded to Cloudinary:', outputUrl);
          break;

        case 'text-to-speech':
          console.log('🎤 [Processor] Processing text-to-speech...');
          const voice = job.data.metadata?.voice || 'Kore';
          console.log('🎙️ [Processor] Using voice:', voice);
          const audioBuffer = await this.gemini.textToSpeech(prompt, voice);
          console.log('✅ [Processor] Audio generated, size:', audioBuffer.length, 'bytes');
          
          // Convert raw PCM to proper WAV format with header
          console.log('🔧 [Processor] Adding WAV header to PCM audio...');
          const wavBuffer = await this.convertPCMtoWAV(audioBuffer);
          console.log('✅ [Processor] WAV conversion complete, size:', wavBuffer.length, 'bytes');
          
          // Upload to Cloudinary as video (audio files are treated as video in Cloudinary)
          const audioBase64 = wavBuffer.toString('base64');
          const audioDataUri = `data:audio/wav;base64,${audioBase64}`;
          
          try {
            outputUrl = await this.cloudinary.uploadBase64(audioDataUri, 'video');
            console.log('✅ [Processor] Audio uploaded to Cloudinary:', outputUrl);
          } catch (cloudinaryError) {
            console.warn('⚠️  [Processor] Cloudinary upload failed, storing as data URI');
            console.warn('Error:', cloudinaryError.message);
            // Fallback: store as data URI in database
            outputUrl = audioDataUri;
          }
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
