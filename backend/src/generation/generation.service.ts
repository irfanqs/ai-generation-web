import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from './cloudinary.service';
import { calculateCreditCost } from './credit-costs.config';

@Injectable()
export class GenerationService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
    @InjectQueue('generation') private generationQueue: Queue,
  ) {}

  async createGeneration(
    userId: string,
    type: string,
    prompt?: string,
    file?: Express.Multer.File,
    metadata?: any,
  ) {
    console.log('📥 [GenerationService] New generation request');
    console.log('👤 [GenerationService] User ID:', userId);
    console.log('🎯 [GenerationService] Type:', type);
    console.log('📝 [GenerationService] Prompt:', prompt);
    console.log('📎 [GenerationService] Has file:', !!file);
    console.log('📊 [GenerationService] Metadata:', metadata);
    
    // Calculate credit cost based on type and options
    const creditCost = calculateCreditCost(type, {
      duration: metadata?.duration,
      textLength: prompt?.length,
      count: metadata?.count || 1,
    });
    
    console.log('💰 [GenerationService] Credit cost:', creditCost);
    
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    console.log('💰 [GenerationService] User credits:', user.credits);
    
    if (user.credits < creditCost) {
      console.error('❌ [GenerationService] Insufficient credits');
      throw new BadRequestException(`Insufficient credits. Required: ${creditCost}, Available: ${user.credits}`);
    }

    let inputUrl: string | null = null;
    if (file) {
      console.log('📤 [GenerationService] Uploading input file...');
      inputUrl = await this.cloudinary.uploadFile(file);
      console.log('✅ [GenerationService] Input file uploaded:', inputUrl);
    }

    const generation = await this.prisma.generation.create({
      data: {
        userId,
        type,
        prompt,
        inputUrl,
        outputUrl: '',
        status: 'pending',
        metadata: {
          ...metadata,
          creditCost,
        },
      },
    });
    console.log('✅ [GenerationService] Generation record created:', generation.id);

    console.log('📮 [GenerationService] Adding job to queue...');
    await this.generationQueue.add('process', {
      generationId: generation.id,
      userId,
      type,
      prompt,
      inputUrl,
      metadata,
    });
    console.log('✅ [GenerationService] Job added to queue');

    await this.prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: creditCost } },
    });
    console.log(`✅ [GenerationService] Credits decremented by ${creditCost}`);

    return generation;
  }

  async getUserGenerations(userId: string) {
    return this.prisma.generation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getGeneration(id: string, userId: string) {
    return this.prisma.generation.findFirst({
      where: { id, userId },
    });
  }

  /**
   * Check if user has enough credits and deduct them
   */
  async checkAndDeductCredits(userId: string, creditCost: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    
    if (!user || user.credits < creditCost) {
      console.log(`❌ [GenerationService] Insufficient credits. Required: ${creditCost}, Available: ${user?.credits || 0}`);
      return false;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: creditCost } },
    });
    
    console.log(`✅ [GenerationService] Credits deducted: ${creditCost}`);
    return true;
  }

  /**
   * Refund credits to user (on failure)
   */
  async refundCredits(userId: string, creditCost: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: creditCost } },
    });
    console.log(`💰 [GenerationService] Credits refunded: ${creditCost}`);
  }

  /**
   * Create generation record (for direct API calls without queue)
   */
  async createGenerationRecord(
    userId: string,
    data: {
      type: string;
      prompt?: string;
      outputBase64?: string;
      creditCost: number;
      metadata?: any;
    },
  ) {
    let outputUrl = '';
    
    // Upload to Cloudinary if we have base64 output
    if (data.outputBase64) {
      try {
        const isVideo = data.type.includes('video');
        outputUrl = await this.cloudinary.uploadBase64(
          data.outputBase64,
          isVideo ? 'video' : 'image',
        );
      } catch (error) {
        console.error('⚠️ [GenerationService] Failed to upload to Cloudinary:', error);
      }
    }

    const generation = await this.prisma.generation.create({
      data: {
        userId,
        type: data.type,
        prompt: data.prompt,
        outputUrl,
        status: 'completed',
        metadata: {
          ...data.metadata,
          creditCost: data.creditCost,
        },
      },
    });

    console.log('✅ [GenerationService] Generation record created:', generation.id);
    return generation;
  }
}
