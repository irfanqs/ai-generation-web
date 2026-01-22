import { Controller, Post, Body, Get, Put, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() body: { email: string; password: string; name?: string }) {
    return this.authService.register(body.email, body.password, body.name);
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Put('api-key')
  async updateApiKey(@Request() req, @Body() body: { apiKey: string }) {
    return this.authService.updateGeminiApiKey(req.user.id, body.apiKey);
  }

  @UseGuards(JwtAuthGuard)
  @Get('api-key')
  async getApiKeyStatus(@Request() req) {
    const apiKey = await this.authService.getGeminiApiKey(req.user.id);
    return { hasApiKey: !!apiKey };
  }
}
