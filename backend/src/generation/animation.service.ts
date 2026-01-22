import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from './gemini.service';
import { CloudinaryService } from './cloudinary.service';
import axios from 'axios';

export interface CharacterDNA {
  visualDNA: string;
  topClothing: string;
  bottomClothing: string;
}

export interface Scene {
  id: number;
  character: string;
  environment: string[];
  actionFlow: string[];
  dialogue: {
    voiceType: string;
    text: string;
  };
}

@Injectable()
export class AnimationService {
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(
    private prisma: PrismaService,
    private gemini: GeminiService,
    private cloudinary: CloudinaryService,
  ) {}

  async scanCharacterDNA(imageBase64: string, apiKey: string): Promise<CharacterDNA> {
    console.log('🔬 [AnimationService] Scanning character DNA...');
    
    const prompt = `Analyze this character image in detail for animation consistency. Provide a comprehensive description in Indonesian language.

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{
  "visualDNA": "Detailed description of face shape, eyes (color, size, shape), eyebrows, nose, lips, jawline, skin tone, hair (color, length, style, texture), any distinctive features like freckles, glasses, etc. Be very specific for animation consistency.",
  "topClothing": "Detailed description of upper body clothing - type, color, material, pattern, fit. If not visible, say 'Tidak terlihat dalam gambar (not visible in the image).'",
  "bottomClothing": "Detailed description of lower body clothing - type, color, material. If not visible, say 'Tidak terlihat dalam gambar (not visible in the image).'"
}`;

    try {
      const modelName = 'gemini-2.0-flash';
      const url = `${this.baseUrl}/models/${modelName}:generateContent?key=${apiKey}`;
      
      const response = await axios.post(url, {
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
          ]
        }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
      }, { headers: { 'Content-Type': 'application/json' }, timeout: 30000 });

      const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Failed to parse character DNA');
    } catch (error: any) {
      console.error('💥 [AnimationService] Error scanning DNA:', error.message);
      throw error;
    }
  }

  async generateStoryScenes(
    storyTitle: string,
    characterName: string,
    characterDNA: CharacterDNA,
    artStyle: string,
    apiKey: string,
    sceneCount: number = 4
  ): Promise<Scene[]> {
    console.log('📖 [AnimationService] Generating story scenes...');
    
    const prompt = `You are a professional storyboard writer for animated content. Create ${sceneCount} scenes for this story in Indonesian language.

Story Title: "${storyTitle}"
Main Character: ${characterName}
Character Description: ${characterDNA.visualDNA}
Character Clothing: Top - ${characterDNA.topClothing}, Bottom - ${characterDNA.bottomClothing}
Art Style: ${artStyle}

Create a compelling visual story with clear progression. Each scene should have:
1. Environment - where the scene takes place and lighting conditions
2. Action Flow - what the character is doing (3 action beats)
3. Dialogue - what the character says with voice emotion

Return ONLY a valid JSON array (no markdown, no code blocks):
[
  {
    "id": 1,
    "character": "Character clothing description (copy from above)",
    "environment": ["Location name", "Lighting/time of day description"],
    "actionFlow": ["Main action description", "Secondary action", "Reaction/expression"],
    "dialogue": {
      "voiceType": "Female/Male, Emotion (Soft/Energetic/Thoughtful/Excited), Speed (Slow/Medium/Fast)",
      "text": "[Dialogue in Indonesian with brackets]"
    }
  }
]

Make the story flow naturally from scene to scene. Use Indonesian language for all descriptions and dialogue.`;

    try {
      const modelName = 'gemini-2.0-flash';
      const url = `${this.baseUrl}/models/${modelName}:generateContent?key=${apiKey}`;
      
      const response = await axios.post(url, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 4096 }
      }, { headers: { 'Content-Type': 'application/json' }, timeout: 60000 });

      const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Failed to parse story scenes');
    } catch (error: any) {
      console.error('💥 [AnimationService] Error generating scenes:', error.message);
      throw error;
    }
  }

  async generateScenePreview(
    scene: Scene,
    characterDNA: CharacterDNA,
    characterImageBase64: string,
    artStyle: string,
    aspectRatio: string,
    apiKey: string
  ): Promise<string> {
    console.log('🎨 [AnimationService] Generating scene preview...');
    
    const aspectMap: Record<string, string> = {
      'landscape': '16:9',
      'portrait': '9:16',
      'square': '1:1'
    };
    
    const artStylePrompts: Record<string, string> = {
      '3d-pixar': '3D Disney Pixar animation style, cute, vibrant colors, expressive characters, high detail, 3D render, Pixar quality',
      'ghibli': 'Studio Ghibli anime style, 2D hand-drawn, lush backgrounds, soft pastel colors, cel shaded, Japanese animation',
      '3d-realistic': 'Unreal Engine 5 style, hyper-realistic 3D, dramatic cinematic lighting, 8k quality, photorealistic',
      'claymation': 'Claymation stop motion style, plasticine texture, Aardman animation, tactile handmade feel',
      'low-poly': 'Low poly 3D style, minimalist geometric shapes, angular, retro video game aesthetic',
      'watercolor': 'Watercolor animation style, soft edges, painterly artistic, dreamy wet brush texture, paper texture'
    };

    const stylePrompt = artStylePrompts[artStyle] || artStylePrompts['3d-pixar'];
    
    const prompt = `Create a single animation frame/still image for this scene.

CHARACTER (MUST MATCH EXACTLY):
${characterDNA.visualDNA}
Clothing: ${characterDNA.topClothing}. ${characterDNA.bottomClothing}

SCENE:
Location: ${scene.environment.join(', ')}
Action: ${scene.actionFlow[0]}

ART STYLE: ${stylePrompt}
ASPECT RATIO: ${aspectMap[aspectRatio] || '16:9'}

Generate a high-quality animation frame showing this exact character in this scene. The character's face, hair, and clothing MUST match the reference image exactly. Focus on the main action described.`;

    try {
      const modelName = 'gemini-2.5-flash-image';
      const url = `${this.baseUrl}/models/${modelName}:generateContent?key=${apiKey}`;
      
      const response = await axios.post(url, {
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: characterImageBase64 } }
          ]
        }],
        generationConfig: { temperature: 1, topK: 40, topP: 0.95 }
      }, { headers: { 'Content-Type': 'application/json' }, timeout: 120000 });

      if (response.data.candidates?.[0]?.content?.parts) {
        for (const part of response.data.candidates[0].content.parts) {
          if (part.inlineData?.data) {
            const imageDataUri = `data:image/png;base64,${part.inlineData.data}`;
            return await this.cloudinary.uploadBase64(imageDataUri, 'image');
          }
        }
      }
      throw new Error('No image generated for scene preview');
    } catch (error: any) {
      console.error('💥 [AnimationService] Error generating preview:', error.message);
      throw error;
    }
  }

  async generateSceneVideo(
    imageUrl: string,
    scene: Scene,
    artStyle: string,
    apiKey: string
  ): Promise<string> {
    console.log('🎬 [AnimationService] Generating scene video...');
    
    const motionPrompt = `Animate this scene: ${scene.actionFlow.join('. ')}. 
Style: Smooth ${artStyle} animation. 
Camera: Subtle movement to add life.
Duration: 4-6 seconds.`;

    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBase64 = Buffer.from(response.data).toString('base64');
    
    const videoBase64 = await this.gemini.generateVideo(imageBase64, motionPrompt, apiKey);
    
    const videoDataUri = `data:video/mp4;base64,${videoBase64}`;
    const videoUrl = await this.cloudinary.uploadBase64(videoDataUri, 'video');
    
    return videoUrl;
  }

  async deductCredits(userId: string, amount: number, operation: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    
    if (!user || user.credits < amount) {
      return false;
    }
    
    await this.prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: amount } }
    });
    
    console.log(`💰 [AnimationService] Deducted ${amount} credits for ${operation}`);
    return true;
  }
}
