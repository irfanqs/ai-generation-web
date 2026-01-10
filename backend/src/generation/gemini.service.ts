import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class GeminiService {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private ai: GoogleGenAI;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (!this.apiKey) {
      console.error('❌ GEMINI_API_KEY not found in environment variables');
    } else {
      console.log('✅ Gemini API Key loaded:', this.apiKey.substring(0, 20) + '...');
    }
    
    // Initialize GoogleGenAI for video generation
    this.ai = new GoogleGenAI({
      apiKey: this.apiKey,
    });
  }

  async generateImage(prompt: string): Promise<string> {
    console.log('🎨 [GeminiService] Starting image generation...');
    console.log('📝 [GeminiService] Prompt:', prompt);
    
    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      console.error('❌ [GeminiService] Invalid prompt');
      throw new Error('Prompt is required and must be a non-empty string');
    }
    
    try {
      const modelName = 'gemini-2.5-flash-image';
      const url = `${this.baseUrl}/models/${modelName}:generateContent?key=${this.apiKey}`;
      
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

  async editImage(imageBase64: string, prompt: string): Promise<string> {
    console.log('✏️  [GeminiService] Starting image editing...');
    console.log('📝 [GeminiService] Prompt:', prompt);
    
    try {
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

  async generateVideo(imageBase64: string, prompt?: string): Promise<string> {
    console.log('🎬 [GeminiService] Starting video generation...');
    console.log('📝 [GeminiService] Prompt:', prompt);
    
    try {
      const videoPrompt = prompt || 'Animate this image with smooth motion';
      
      console.log('📤 [GeminiService] Starting Veo operation...');
      let operation = await this.ai.models.generateVideos({
        model: 'veo-3.1-generate-preview',
        prompt: videoPrompt,
      });
      
      console.log('✅ [GeminiService] Operation started:', operation.name);
      console.log('⏳ [GeminiService] Polling for completion...');
      
      // Poll for completion (max 10 minutes)
      let attempts = 0;
      const maxAttempts = 60;
      
      while (!operation.done && attempts < maxAttempts) {
        attempts++;
        console.log(`⏳ [GeminiService] Attempt ${attempts}/${maxAttempts}...`);
        await new Promise((resolve) => setTimeout(resolve, 10000));
        
        operation = await this.ai.operations.getVideosOperation({
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
        
        // Use SDK's download method instead of direct axios
        console.log('📥 [GeminiService] Downloading video using SDK...');
        
        try {
          // Download to temp file first
          const tempPath = `/tmp/video-${Date.now()}.mp4`;
          await this.ai.files.download({
            file: videoFile,
            downloadPath: tempPath,
          });
          
          console.log('✅ [GeminiService] Video downloaded to temp file');
          
          // Read file and convert to base64
          const fs = require('fs');
          const videoBuffer = fs.readFileSync(tempPath);
          const videoBase64 = videoBuffer.toString('base64');
          
          // Clean up temp file
          fs.unlinkSync(tempPath);
          
          console.log('✅ [GeminiService] Video converted to base64, length:', videoBase64.length);
          
          return videoBase64;
        } catch (downloadError: any) {
          console.error('⚠️ [GeminiService] SDK download failed, trying direct URL...');
          
          // Fallback: try direct URL with API key in query
          const videoUri = videoFile.uri;
          console.log('🎥 [GeminiService] Video URI:', videoUri);
          
          const response = await axios.get(videoUri, {
            responseType: 'arraybuffer',
            timeout: 60000,
            params: {
              key: this.apiKey,
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

  async textToSpeech(text: string, voice: string = 'Kore'): Promise<Buffer> {
    console.log('🎤 [GeminiService] Starting text-to-speech...');
    console.log('📝 [GeminiService] Text:', text);
    console.log('🎙️ [GeminiService] Voice:', voice);
    
    try {
      const response = await this.ai.models.generateContent({
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
      console.log('📊 [GeminiService] Response structure:', JSON.stringify({
        hasCandidates: !!response.candidates,
        candidatesLength: response.candidates?.length,
        hasContent: !!response.candidates?.[0]?.content,
        hasParts: !!response.candidates?.[0]?.content?.parts,
        partsLength: response.candidates?.[0]?.content?.parts?.length,
        firstPartKeys: response.candidates?.[0]?.content?.parts?.[0] ? Object.keys(response.candidates[0].content.parts[0]) : []
      }, null, 2));
      
      const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (data) {
        const audioBuffer = Buffer.from(data, 'base64');
        console.log('🎵 [GeminiService] Audio buffer size:', audioBuffer.length);
        return audioBuffer;
      }
      
      console.error('❌ [GeminiService] No audio data found in response');
      console.error('Full response:', JSON.stringify(response, null, 2));
      throw new Error('No audio data in response');
    } catch (error: any) {
      console.error('💥 [GeminiService] Error generating speech:', error.message);
      throw error;
    }
  }
}
