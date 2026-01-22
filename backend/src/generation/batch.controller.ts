import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NonAdminGuard } from './non-admin.guard';
import { PrismaService } from '../prisma/prisma.service';
import { BatchService, BatchRequest } from './batch.service';
import { calculateCreditCost } from './credit-costs.config';

interface CreateBatchDto {
  type: 'character' | 'food' | 'product';
  requests: {
    prompt: string;
    imageBase64?: string;
  }[];
  displayName?: string;
}

@Controller('batch')
@UseGuards(JwtAuthGuard, NonAdminGuard)
export class BatchController {
  constructor(
    private prisma: PrismaService,
    private batchService: BatchService,
    @InjectQueue('batch-generation') private batchQueue: Queue,
  ) {}

  private async getUserApiKey(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user?.geminiApiKey) {
      throw new BadRequestException('Please set your Gemini API key in Settings first');
    }
    return user.geminiApiKey;
  }

  /**
   * Create a new batch generation job
   * Supports: character creation, food photography, product with model
   */
  @Post('create')
  async createBatchJob(@Request() req, @Body() body: CreateBatchDto) {
    const userId = req.user.id;
    const { type, requests, displayName } = body;

    console.log(`📦 [BatchController] Creating batch job`);
    console.log(`👤 [BatchController] User: ${userId}`);
    console.log(`🎯 [BatchController] Type: ${type}`);
    console.log(`📊 [BatchController] Requests: ${requests.length}`);

    // Get user's API key
    const apiKey = await this.getUserApiKey(userId);

    if (!requests || requests.length === 0) {
      throw new BadRequestException('At least one request is required');
    }

    if (requests.length > 20) {
      throw new BadRequestException('Maximum 20 requests per batch');
    }

    // Calculate credit cost based on type
    const creditCostPerItem = this.getCreditCostPerItem(type);
    const totalCreditCost = creditCostPerItem * requests.length;

    // Check user credits
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.credits < totalCreditCost) {
      throw new BadRequestException(
        `Insufficient credits. Required: ${totalCreditCost}, Available: ${user?.credits || 0}`,
      );
    }

    // Deduct credits
    await this.prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: totalCreditCost } },
    });

    // Create generation record
    const generation = await this.prisma.generation.create({
      data: {
        userId,
        type: `batch-${type}`,
        prompt: `Batch ${type} generation with ${requests.length} items`,
        outputUrl: '',
        status: 'pending',
        metadata: {
          batchType: type,
          requestCount: requests.length,
          creditCost: totalCreditCost,
          creditCostPerItem,
        },
      },
    });

    // Format requests for batch service
    const batchRequests: BatchRequest[] = requests.map((req, index) => ({
      key: `${type}-${index}`,
      prompt: req.prompt,
      imageBase64: req.imageBase64,
    }));

    // Add to queue with API key
    await this.batchQueue.add('process-batch', {
      batchGenerationId: generation.id,
      userId,
      type,
      requests: batchRequests,
      displayName: displayName || `${type}-${userId}-${Date.now()}`,
      apiKey,
    });

    console.log(`✅ [BatchController] Batch job queued: ${generation.id}`);

    return {
      id: generation.id,
      status: 'pending',
      type: `batch-${type}`,
      requestCount: requests.length,
      creditCost: totalCreditCost,
      message: 'Batch job created. Processing may take up to 24 hours (usually much faster).',
    };
  }

  /**
   * Get batch job status
   */
  @Get('status/:id')
  async getBatchStatus(@Request() req, @Param('id') id: string) {
    const userId = req.user.id;

    const generation = await this.prisma.generation.findFirst({
      where: { id, userId },
    });

    if (!generation) {
      throw new BadRequestException('Batch job not found');
    }

    const metadata = generation.metadata as any;

    return {
      id: generation.id,
      status: generation.status,
      type: generation.type,
      createdAt: generation.createdAt,
      results: metadata?.results || [],
      errors: metadata?.errors || [],
      successCount: metadata?.successCount || 0,
      failCount: metadata?.failCount || 0,
      requestCount: metadata?.requestCount || 0,
    };
  }

  /**
   * Get all batch jobs for user
   */
  @Get('history')
  async getBatchHistory(@Request() req) {
    const userId = req.user.id;

    const generations = await this.prisma.generation.findMany({
      where: {
        userId,
        type: { startsWith: 'batch-' },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return generations.map((gen) => {
      const metadata = gen.metadata as any;
      return {
        id: gen.id,
        status: gen.status,
        type: gen.type,
        createdAt: gen.createdAt,
        requestCount: metadata?.requestCount || 0,
        successCount: metadata?.successCount || 0,
        creditCost: metadata?.creditCost || 0,
      };
    });
  }

  /**
   * Get credit cost per item based on type
   */
  private getCreditCostPerItem(type: string): number {
    switch (type) {
      case 'character':
        return 2; // 50% discount from regular 4 credits
      case 'food':
        return 2; // 50% discount from regular 4 credits
      case 'product':
        return 2.5; // 50% discount from regular 5 credits
      default:
        return 2;
    }
  }
}
