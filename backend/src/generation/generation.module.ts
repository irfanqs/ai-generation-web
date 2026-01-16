import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { GenerationController } from './generation.controller';
import { GenerationService } from './generation.service';
import { GeminiService } from './gemini.service';
import { CloudinaryService } from './cloudinary.service';
import { GenerationProcessor } from './generation.processor';
import { NonAdminGuard } from './non-admin.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { BatchService } from './batch.service';
import { BatchController } from './batch.controller';
import { BatchProcessor } from './batch.processor';
import { VeoService } from './veo.service';
import { VeoController } from './veo.controller';
import { AnimationService } from './animation.service';
import { AnimationController } from './animation.controller';
import { AffiliateController } from './affiliate.controller';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'generation',
    }),
    BullModule.registerQueue({
      name: 'batch-generation',
    }),
    PrismaModule,
  ],
  controllers: [GenerationController, BatchController, VeoController, AnimationController, AffiliateController],
  providers: [
    GenerationService,
    GeminiService,
    CloudinaryService,
    GenerationProcessor,
    NonAdminGuard,
    BatchService,
    BatchProcessor,
    VeoService,
    AnimationService,
  ],
})
export class GenerationModule {}
