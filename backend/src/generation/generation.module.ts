import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { GenerationController } from './generation.controller';
import { GenerationService } from './generation.service';
import { GeminiService } from './gemini.service';
import { CloudinaryService } from './cloudinary.service';
import { GenerationProcessor } from './generation.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'generation',
    }),
  ],
  controllers: [GenerationController],
  providers: [GenerationService, GeminiService, CloudinaryService, GenerationProcessor],
})
export class GenerationModule {}
