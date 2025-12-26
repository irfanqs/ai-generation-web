import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class GeminiService {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (!this.apiKey) {
      console.error('❌ GEMINI_API_KEY not found in environment variables');
    } else {
      console.log('✅ Gemini API Key loaded:', this.apiKey.substring(0, 20) + '...');
    }
  }

  async generateImage(prompt: string): Promise<string> {
    console.log('🎨 [GeminiService] Starting image generation...');
    console.log('📝 [GeminiService] Prompt:', prompt);
    
    try {
      // Using Gemini 2.5 Flash Image model
      const modelName = 'gemini-2.5-flash-image';
      const url = `${this.baseUrl}/models/${modelName}:generateContent?key=${this.apiKey}`;
      
      console.log('📤 [GeminiService] Using model:', modelName);
      
      const response = await axios.post(url, {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 1,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      });

      console.log('✅ [GeminiService] Received response from Gemini');
      console.log('📦 [GeminiService] Response status:', response.status);

      // Extract image from response
      if (response.data.candidates && response.data.candidates[0]) {
        const candidate = response.data.candidates[0];
        
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            // Check for inline data (base64 image)
            if (part.inlineData && part.inlineData.data) {
              console.log('🖼️  [GeminiService] Image data found!');
              console.log('📏 [GeminiService] Data length:', part.inlineData.data.length);
              console.log('🎨 [GeminiService] Mime type:', part.inlineData.mimeType);
              return part.inlineData.data;
            }
            
            // Check for text response (might contain base64)
            if (part.text) {
              console.log('📝 [GeminiService] Text response:', part.text.substring(0, 100));
            }
          }
        }
      }

      console.error('❌ [GeminiService] No image data in response');
      console.error('📦 [GeminiService] Full response:', JSON.stringify(response.data, null, 2));
      throw new Error('No image generated from Gemini API');
    } catch (error) {
      console.error('💥 [GeminiService] Error generating image:', error.message);
      if (error.response) {
        console.error('📊 [GeminiService] Error response status:', error.response.status);
        console.error('📊 [GeminiService] Error response data:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  async editImage(imageBase64: string, prompt: string): Promise<string> {
    console.log('✏️  [GeminiService] Starting image editing...');
    console.log('📝 [GeminiService] Prompt:', prompt);
    console.log('🖼️  [GeminiService] Input image length:', imageBase64.length);
    
    try {
      // Using Gemini 2.5 Flash Image for editing
      const modelName = 'gemini-2.5-flash-image';
      const url = `${this.baseUrl}/models/${modelName}:generateContent?key=${this.apiKey}`;
      
      const response = await axios.post(url, {
        contents: [{
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: imageBase64,
              }
            }
          ]
        }]
      });

      console.log('✅ [GeminiService] Received response from Gemini');

      // Extract edited image from response
      if (response.data.candidates && response.data.candidates[0]) {
        const candidate = response.data.candidates[0];
        
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.data) {
              console.log('🖼️  [GeminiService] Edited image data found!');
              return part.inlineData.data;
            }
          }
        }
      }

      console.error('❌ [GeminiService] No image data in response');
      throw new Error('No edited image generated');
    } catch (error) {
      console.error('💥 [GeminiService] Error editing image:', error.message);
      if (error.response) {
        console.error('📊 [GeminiService] Error response:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  async generateVideo(imageBase64: string, prompt?: string): Promise<string> {
    console.log('🎬 [GeminiService] Video generation requested');
    throw new Error('Video generation is not yet available. This feature requires Google Veo API access.');
  }

  async textToSpeech(text: string): Promise<Buffer> {
    console.log('🎤 [GeminiService] Text-to-speech requested');
    throw new Error('Text-to-speech is not available via Gemini API. Please use Google Cloud Text-to-Speech API instead.');
  }
}
