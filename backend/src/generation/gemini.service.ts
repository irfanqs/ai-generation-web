import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class GeminiService {
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor() {
    console.log('✅ GeminiService initialized (user API key mode)');
  }

  private getAI(apiKey: string): GoogleGenAI {
    return new GoogleGenAI({ apiKey });
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/models?key=${apiKey}`;
      const response = await axios.get(url, { timeout: 10000 });
      return response.status === 200;
    } catch (error) {
      console.error('❌ [GeminiService] API key validation failed:', error.message);
      return false;
    }
  }

  async generateImage(prompt: string, apiKey: string): Promise<string> {
    console.log('🎨 [GeminiService] Starting image generation...');
    console.log('📝 [GeminiService] Prompt:', prompt);
    
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
    
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      console.error('❌ [GeminiService] Invalid prompt');
      throw new Error('Prompt is required and must be a non-empty string');
    }
    
    try {
      const modelName = 'gemini-2.5-flash-image';
      const url = `${this.baseUrl}/models/${modelName}:generateContent?key=${apiKey}`;
      
      const response = await axios.post(url, {
        contents: [{
          parts: [{ text: prompt.trim() }]
        }],
        generationConfig: {
          temperature: 1,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000,
      });

      console.log('✅ [GeminiService] Received response from Gemini');

      if (response.data.candidates && response.data.candidates[0]) {
        const candidate = response.data.candidates[0];
        
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.data) {
              console.log('🖼️  [GeminiService] Image data found!');
              return part.inlineData.data;
            }
          }
        }
      }

      console.error('❌ [GeminiService] No image data in response');
      throw new Error('No image generated from Gemini API');
    } catch (error: any) {
      console.error('💥 [GeminiService] Error generating image:', error.message);
      if (error.response) {
        console.error('📊 [GeminiService] Error response:', error.response.status, error.response.data);
      }
      throw error;
    }
  }

  async editImage(imageBase64: string, prompt: string, apiKey: string, modelReferenceBase64?: string): Promise<string> {
    console.log('✏️  [GeminiService] Starting image editing...');
    console.log('📝 [GeminiService] Prompt:', prompt);
    console.log('👤 [GeminiService] Has model reference:', !!modelReferenceBase64);
    
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
    
    try {
      const modelName = 'gemini-2.5-flash-image';
      const url = `${this.baseUrl}/models/${modelName}:generateContent?key=${apiKey}`;
      
      const parts: any[] = [{ text: prompt }];
      
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64,
        }
      });
      
      if (modelReferenceBase64) {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: modelReferenceBase64,
          }
        });
        console.log('✅ [GeminiService] Model reference image added to request');
      }
      
      const response = await axios.post(url, {
        contents: [{
          parts: parts
        }]
      });

      console.log('✅ [GeminiService] Received response from Gemini');

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
    } catch (error: any) {
      console.error('💥 [GeminiService] Error editing image:', error.message);
      throw error;
    }
  }

  async generateVideo(imageBase64: string, prompt: string, apiKey: string): Promise<string> {
    console.log('🎬 [GeminiService] Starting video generation...');
    console.log('📝 [GeminiService] Prompt:', prompt);
    
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
    
    try {
      const ai = this.getAI(apiKey);
      const videoPrompt = prompt || 'Animate this image with smooth motion';
      
      console.log('📤 [GeminiService] Starting Veo operation...');
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-generate-preview',
        prompt: videoPrompt,
      });
      
      console.log('✅ [GeminiService] Operation started:', operation.name);
      console.log('⏳ [GeminiService] Polling for completion...');
      
      let attempts = 0;
      const maxAttempts = 60;
      
      while (!operation.done && attempts < maxAttempts) {
        attempts++;
        console.log(`⏳ [GeminiService] Attempt ${attempts}/${maxAttempts}...`);
        await new Promise((resolve) => setTimeout(resolve, 10000));
        
        operation = await ai.operations.getVideosOperation({
          operation: operation,
        });
      }
      
      if (!operation.done) {
        throw new Error('Video generation timeout after 10 minutes');
      }
      
      console.log('✅ [GeminiService] Video generation complete!');
      
      if (operation.response && operation.response.generatedVideos) {
        const videoFile = operation.response.generatedVideos[0].video;
        console.log('🎥 [GeminiService] Video file:', videoFile);
        
        console.log('📥 [GeminiService] Downloading video using SDK...');
        
        try {
          const tempPath = `/tmp/video-${Date.now()}.mp4`;
          await ai.files.download({
            file: videoFile,
            downloadPath: tempPath,
          });
          
          console.log('✅ [GeminiService] Video downloaded to temp file');
          
          const fs = require('fs');
          const videoBuffer = fs.readFileSync(tempPath);
          const videoBase64 = videoBuffer.toString('base64');
          
          fs.unlinkSync(tempPath);
          
          console.log('✅ [GeminiService] Video converted to base64, length:', videoBase64.length);
          
          return videoBase64;
        } catch (downloadError: any) {
          console.error('⚠️ [GeminiService] SDK download failed, trying direct URL...');
          
          const videoUri = videoFile.uri;
          console.log('🎥 [GeminiService] Video URI:', videoUri);
          
          const response = await axios.get(videoUri, {
            responseType: 'arraybuffer',
            timeout: 60000,
            params: {
              key: apiKey,
            },
          });
          
          console.log('✅ [GeminiService] Video downloaded via fallback!');
          const videoBase64 = Buffer.from(response.data).toString('base64');
          
          return videoBase64;
        }
      }
      
      throw new Error('No video in response');
    } catch (error: any) {
      console.error('💥 [GeminiService] Error generating video:', error.message);
      if (error.response) {
        console.error('📊 [GeminiService] Error status:', error.response.status);
        console.error('📊 [GeminiService] Error data:', error.response.data);
      }
      throw error;
    }
  }

  async textToSpeech(text: string, apiKey: string, voice: string = 'Kore'): Promise<Buffer> {
    console.log('🎤 [GeminiService] Starting text-to-speech...');
    console.log('📝 [GeminiService] Text:', text);
    console.log('🎙️ [GeminiService] Voice:', voice);
    
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
    
    try {
      const ai = this.getAI(apiKey);
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
        },
      });
      
      console.log('✅ [GeminiService] Speech generated!');
      
      const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (data) {
        const audioBuffer = Buffer.from(data, 'base64');
        console.log('🎵 [GeminiService] Audio buffer size:', audioBuffer.length);
        return audioBuffer;
      }
      
      console.error('❌ [GeminiService] No audio data found in response');
      throw new Error('No audio data in response');
    } catch (error: any) {
      console.error('💥 [GeminiService] Error generating speech:', error.message);
      throw error;
    }
  }
}
