import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { BatchService, BatchRequest } from './batch.service';
import { CloudinaryService } from './cloudinary.service';

interface BatchJobData {
  batchGenerationId: string;
  userId: string;
  type: string;
  requests: BatchRequest[];
  displayName: string;
  apiKey: string;
}

@Processor('batch-generation')
export class BatchProcessor {
  constructor(
    private prisma: PrismaService,
    private batchService: BatchService,
    private cloudinary: CloudinaryService,
  ) {}

  @Process('process-batch')
  async handleBatchJob(job: Job<BatchJobData>) {
    const { batchGenerationId, userId, type, requests, displayName, apiKey } = job.data;

    console.log(`📦 [BatchProcessor] Processing batch job: ${batchGenerationId}`);
    console.log(`👤 [BatchProcessor] User: ${userId}`);
    console.log(`🎯 [BatchProcessor] Type: ${type}`);
    console.log(`📊 [BatchProcessor] Requests: ${requests.length}`);
    console.log(`🔑 [BatchProcessor] Has API Key: ${!!apiKey}`);

    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    try {
      // Update status to processing
      await this.prisma.generation.update({
        where: { id: batchGenerationId },
        data: { status: 'processing' },
      });

      // Create batch job
      const { jobName } = await this.batchService.createImageBatchJob(
        requests,
        displayName,
        apiKey,
      );

      console.log(`✅ [BatchProcessor] Batch job created: ${jobName}`);

      // Store job name in metadata
      await this.prisma.generation.update({
        where: { id: batchGenerationId },
        data: {
          metadata: {
            batchJobName: jobName,
            requestCount: requests.length,
            type,
          },
        },
      });

      // Wait for batch job to complete (poll every 30 seconds, max 2 hours)
      const results = await this.batchService.waitForBatchJob(
        jobName,
        apiKey,
        30000, // 30 seconds
        7200000, // 2 hours
      );

      console.log(`✅ [BatchProcessor] Batch job completed with ${results.length} results`);

      // Upload results to Cloudinary
      const uploadedUrls: string[] = [];
      const errors: string[] = [];

      for (let i = 0; i < results.length; i++) {
        const result = results[i];

        if (result.success && result.imageData) {
          try {
            const imageBuffer = Buffer.from(result.imageData, 'base64');
            const url = await this.cloudinary.uploadBuffer(imageBuffer, 'image');
            uploadedUrls.push(url);
            console.log(`✅ [BatchProcessor] Uploaded result ${i + 1}: ${url}`);
          } catch (uploadError: any) {
            console.error(`❌ [BatchProcessor] Failed to upload result ${i + 1}:`, uploadError.message);
            errors.push(`Result ${i + 1}: Upload failed`);
          }
        } else {
          errors.push(`Result ${i + 1}: ${result.error || 'No image data'}`);
        }
      }

      // Update generation with results
      await this.prisma.generation.update({
        where: { id: batchGenerationId },
        data: {
          status: uploadedUrls.length > 0 ? 'completed' : 'failed',
          outputUrl: uploadedUrls[0] || '', // Primary result
          metadata: {
            batchJobName: jobName,
            requestCount: requests.length,
            type,
            results: uploadedUrls,
            errors: errors.length > 0 ? errors : undefined,
            successCount: uploadedUrls.length,
            failCount: errors.length,
          },
        },
      });

      console.log(`✅ [BatchProcessor] Batch generation completed`);
      console.log(`📊 [BatchProcessor] Success: ${uploadedUrls.length}, Failed: ${errors.length}`);

      return {
        success: true,
        results: uploadedUrls,
        errors,
      };
    } catch (error: any) {
      console.error(`💥 [BatchProcessor] Error:`, error.message);

      await this.prisma.generation.update({
        where: { id: batchGenerationId },
        data: {
          status: 'failed',
          metadata: {
            error: error.message,
            type,
          },
        },
      });

      throw error;
    }
  }
}
