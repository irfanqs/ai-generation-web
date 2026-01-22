import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../generation/gemini.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private geminiService: GeminiService,
  ) {}

  async register(email: string, password: string, name?: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    const token = this.jwtService.sign({ userId: user.id, email: user.email });
    
    return {
      user: { id: user.id, email: user.email, name: user.name, credits: user.credits },
      token,
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({ userId: user.id, email: user.email });
    
    return {
      user: { id: user.id, email: user.email, name: user.name, credits: user.credits, isAdmin: user.isAdmin },
      token,
    };
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, credits: true, isAdmin: true, geminiApiKey: true },
    });
  }

  async updateGeminiApiKey(userId: string, apiKey: string) {
    // Validate the API key first
    if (apiKey && apiKey.trim()) {
      const isValid = await this.geminiService.validateApiKey(apiKey.trim());
      if (!isValid) {
        throw new BadRequestException('Invalid Gemini API key');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { geminiApiKey: apiKey?.trim() || null },
      select: { id: true, email: true, name: true, credits: true, isAdmin: true, geminiApiKey: true },
    });

    return {
      message: apiKey ? 'API key saved successfully' : 'API key removed',
      hasApiKey: !!user.geminiApiKey,
    };
  }

  async getGeminiApiKey(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { geminiApiKey: true },
    });
    return user?.geminiApiKey || null;
  }
}
