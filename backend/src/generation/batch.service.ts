import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { PrismaService } from '../prisma/prisma.service';

export interface BatchRequest {
  key: string;
  prompt: string;
  imageBase64?: string;
  config?: {
    temperature?: number;
    responseModalities?: string[];
  };
}

export interface BatchJobResult {
  jobId: string;
  jobName: string;
  status: string;
  results?: BatchResultItem[];
  error?: string;
}

export interface BatchResultItem {
  key: string;
  success: boolean;
  imageData?: string;
  text?: string;
  error?: string;
}

@Injectable()
export class BatchService {
  private ai: GoogleGenAI;
  private apiKey: string;

  constructor(private prisma: PrismaService) {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    console.log('✅ [BatchService] Initialized with Gemini API');
  }

  /**
   * Create a batch job for image generation
   * 50% cheaper than standard API, target 24h turnaround (usually faster)
   */
  async createImageBatchJob(
    requests: BatchRequest[],
    displayName: string,
  ): Promise<{ jobName: string; jobId: string }> {
    console.log(`📦 [BatchService] Creating batch job with ${requests.length} requests`);
    console.log(`📝 [BatchService] Display name: ${displayName}`);

    try {
      // Format requests for batch API
      const inlinedRequests = requests.map((req) => ({
        contents: [
          {
            parts: req.imageBase64
              ? [
                  { text: req.prompt },
                  {
                    inlineData: {
                      mimeType: 'image/jpeg',
                      data: req.imageBase64,
                    },
                  },
                ]
              : [{ text: req.prompt }],
            role: 'user',
          },
        ],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          temperature: req.config?.temperature || 1,
        },
      }));

      // Create batch job using SDK
      const batchJob = await this.ai.batches.create({
        model: 'gemini-2.5-flash-preview-image-generation',
        src: inlinedRequests,
        config: {
          displayName: displayName,
        },
      });

      console.log(`✅ [BatchService] Batch job created: ${batchJob.name}`);

      return {
        jobName: batchJob.name,
        jobId: batchJob.name.split('/').pop() || batchJob.name,
      };
    } catch (error: any) {
      console.error('💥 [BatchService] Error creating batch job:', error.message);
      throw error;
    }
  }

  /**
   * Create a batch job for text generation (embeddings, text completion)
   */
  async createTextBatchJob(
    requests: BatchRequest[],
    displayName: string,
    model: string = 'gemini-2.5-flash',
  ): Promise<{ jobName: string; jobId: string }> {
    console.log(`📦 [BatchService] Creating text batch job with ${requests.length} requests`);

    try {
      const inlinedRequests = requests.map((req) => ({
        contents: [
          {
            parts: [{ text: req.prompt }],
            role: 'user',
          },
        ],
      }));

      const batchJob = await this.ai.batches.create({
        model: model,
        src: inlinedRequests,
        config: {
          displayName: displayName,
        },
      });

      console.log(`✅ [BatchService] Text batch job created: ${batchJob.name}`);

      return {
        jobName: batchJob.name,
        jobId: batchJob.name.split('/').pop() || batchJob.name,
      };
    } catch (error: any) {
      console.error('💥 [BatchService] Error creating text batch job:', error.message);
      throw error;
    }
  }

  /**
   * Get batch job status
   */
  async getBatchJobStatus(jobName: string): Promise<{
    state: string;
    done: boolean;
    error?: string;
  }> {
    console.log(`🔍 [BatchService] Checking status for job: ${jobName}`);

    try {
      const batchJob = await this.ai.batches.get({ name: jobName });

      const state = batchJob.state?.toString() || 'UNKNOWN';
      const done = [
        'JOB_STATE_SUCCEEDED',
        'JOB_STATE_FAILED',
        'JOB_STATE_CANCELLED',
        'JOB_STATE_EXPIRED',
      ].includes(state);

      console.log(`📊 [BatchService] Job state: ${state}, done: ${done}`);

      return {
        state,
        done,
        error: state === 'JOB_STATE_FAILED' ? 'Batch job failed' : undefined,
      };
    } catch (error: any) {
      console.error('💥 [BatchService] Error getting job status:', error.message);
      throw error;
    }
  }

  /**
   * Get batch job results
   */
  async getBatchJobResults(jobName: string): Promise<BatchResultItem[]> {
    console.log(`📥 [BatchService] Getting results for job: ${jobName}`);

    try {
      const batchJob = await this.ai.batches.get({ name: jobName });

      if (batchJob.state?.toString() !== 'JOB_STATE_SUCCEEDED') {
        throw new Error(`Job not completed. Current state: ${batchJob.state}`);
      }

      const results: BatchResultItem[] = [];

      // Check for inline responses
      if (batchJob.dest?.inlinedResponses) {
        console.log(`📊 [BatchService] Found ${batchJob.dest.inlinedResponses.length} inline responses`);

        for (let i = 0; i < batchJob.dest.inlinedResponses.length; i++) {
          const inlineResponse = batchJob.dest.inlinedResponses[i];
          const resultItem: BatchResultItem = {
            key: `request-${i}`,
            success: false,
          };

          if (inlineResponse.response) {
            const candidate = inlineResponse.response.candidates?.[0];
            if (candidate?.content?.parts) {
              for (const part of candidate.content.parts) {
                if (part.inlineData?.data) {
                  resultItem.imageData = part.inlineData.data;
                  resultItem.success = true;
                }
                if (part.text) {
                  resultItem.text = part.text;
                  resultItem.success = true;
                }
              }
            }
          } else if (inlineResponse.error) {
            resultItem.error = inlineResponse.error.message || 'Unknown error';
          }

          results.push(resultItem);
        }
      }

      // Check for file-based responses
      if (batchJob.dest?.fileName) {
        console.log(`📁 [BatchService] Results in file: ${batchJob.dest.fileName}`);

        // Download file to temp location
        const fs = require('fs');
        const tempPath = `/tmp/batch-results-${Date.now()}.jsonl`;
        
        await this.ai.files.download({
          file: batchJob.dest.fileName,
          downloadPath: tempPath,
        });

        const content = fs.readFileSync(tempPath, 'utf-8');
        fs.unlinkSync(tempPath); // Clean up
        
        const lines = content.split('\n').filter((line: string) => line.trim());

        for (const line of lines) {
          const parsed = JSON.parse(line);
          const resultItem: BatchResultItem = {
            key: parsed.key || `request-${results.length}`,
            success: false,
          };

          if (parsed.response?.candidates?.[0]?.content?.parts) {
            for (const part of parsed.response.candidates[0].content.parts) {
              if (part.inlineData?.data) {
                resultItem.imageData = part.inlineData.data;
                resultItem.success = true;
              }
              if (part.text) {
                resultItem.text = part.text;
                resultItem.success = true;
              }
            }
          } else if (parsed.error) {
            resultItem.error = parsed.error.message || 'Unknown error';
          }

          results.push(resultItem);
        }
      }

      console.log(`✅ [BatchService] Retrieved ${results.length} results`);
      return results;
    } catch (error: any) {
      console.error('💥 [BatchService] Error getting results:', error.message);
      throw error;
    }
  }

  /**
   * Cancel a batch job
   */
  async cancelBatchJob(jobName: string): Promise<void> {
    console.log(`🛑 [BatchService] Cancelling job: ${jobName}`);

    try {
      await this.ai.batches.cancel({ name: jobName });
      console.log(`✅ [BatchService] Job cancelled`);
    } catch (error: any) {
      console.error('💥 [BatchService] Error cancelling job:', error.message);
      throw error;
    }
  }

  /**
   * Delete a batch job
   */
  async deleteBatchJob(jobName: string): Promise<void> {
    console.log(`🗑️ [BatchService] Deleting job: ${jobName}`);

    try {
      await this.ai.batches.delete({ name: jobName });
      console.log(`✅ [BatchService] Job deleted`);
    } catch (error: any) {
      console.error('💥 [BatchService] Error deleting job:', error.message);
      throw error;
    }
  }

  /**
   * List all batch jobs
   */
  async listBatchJobs(): Promise<any[]> {
    console.log(`📋 [BatchService] Listing batch jobs`);

    try {
      const jobs: any[] = [];
      const response = await this.ai.batches.list();

      for await (const job of response) {
        jobs.push({
          name: job.name,
          displayName: job.displayName,
          state: job.state,
          createTime: job.createTime,
        });
      }

      console.log(`✅ [BatchService] Found ${jobs.length} jobs`);
      return jobs;
    } catch (error: any) {
      console.error('💥 [BatchService] Error listing jobs:', error.message);
      throw error;
    }
  }

  /**
   * Poll batch job until completion
   * Returns results when done
   */
  async waitForBatchJob(
    jobName: string,
    pollIntervalMs: number = 10000,
    maxWaitMs: number = 3600000, // 1 hour default
  ): Promise<BatchResultItem[]> {
    console.log(`⏳ [BatchService] Waiting for job: ${jobName}`);

    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.getBatchJobStatus(jobName);

      if (status.done) {
        if (status.state === 'JOB_STATE_SUCCEEDED') {
          return await this.getBatchJobResults(jobName);
        } else {
          throw new Error(`Batch job failed with state: ${status.state}`);
        }
      }

      console.log(`⏳ [BatchService] Job still running, waiting ${pollIntervalMs / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Batch job timeout after ${maxWaitMs / 1000}s`);
  }
}
