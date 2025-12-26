import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from './cloudinary.service';

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
  ) {
    console.log('📥 [GenerationService] New generation request');
    console.log('👤 [GenerationService] User ID:', userId);
    console.log('🎯 [GenerationService] Type:', type);
    console.log('📝 [GenerationService] Prompt:', prompt);
    console.log('📎 [GenerationService] Has file:', !!file);
    
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    console.log('💰 [GenerationService] User credits:', user.credits);
    
    if (user.credits < 1) {
      console.error('❌ [GenerationService] Insufficient credits');
      throw new BadRequestException('Insufficient credits');
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
    });
    console.log('✅ [GenerationService] Job added to queue');

    await this.prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: 1 } },
    });
    console.log('✅ [GenerationService] Credits decremented');

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
}
