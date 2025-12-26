# Catatan Penting tentang Gemini API

## Update Terbaru (Desember 2024)

Google Gemini sekarang mendukung berbagai fitur generasi konten:

### 1. Text-to-Image (Imagen 3)
- Model: `imagen-3.0-generate-001` atau `imagen-3.0-fast-generate-001`
- Dokumentasi: https://ai.google.dev/gemini-api/docs/imagen

### 2. Image-to-Image / Image Editing
- Menggunakan Gemini 2.0 Flash dengan vision capabilities
- Model: `gemini-2.0-flash-exp`
- Bisa analyze dan generate berdasarkan image input

### 3. Image-to-Video (Veo)
- Google Veo untuk video generation
- Masih dalam preview/limited access
- Perlu request access terpisah

### 4. Text-to-Speech
- Bisa menggunakan Google Cloud Text-to-Speech API
- Atau tunggu Gemini native TTS support

## Implementasi di Code

File `backend/src/generation/gemini.service.ts` sudah disiapkan dengan placeholder untuk semua fitur. Anda perlu:

1. **Update Model Names**
   - Sesuaikan dengan model yang tersedia di akun Anda
   - Check dokumentasi terbaru: https://ai.google.dev/gemini-api/docs

2. **Handle Response Format**
   - Gemini API return format bisa berbeda per model
   - Imagen biasanya return base64 image
   - Veo return video URL atau base64

3. **Error Handling**
   - Add proper error handling untuk rate limits
   - Handle quota exceeded
   - Retry logic untuk transient errors

## Contoh Update Code

### Text-to-Image (Imagen)
```typescript
async generateImage(prompt: string): Promise<string> {
  const model = this.genAI.getGenerativeModel({ 
    model: 'imagen-3.0-generate-001' 
  });
  
  const result = await model.generateContent({
    prompt: prompt,
    // Additional parameters
    numberOfImages: 1,
    aspectRatio: '1:1',
  });
  
  // Return base64 image data
  const imageData = result.response.candidates[0].content;
  return imageData; // base64 string
}
```

### Image-to-Image
```typescript
async editImage(imageUrl: string, prompt: string): Promise<string> {
  // Download image dan convert ke base64
  const imageBase64 = await this.downloadAndConvertToBase64(imageUrl);
  
  const model = this.genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash-exp' 
  });
  
  const result = await model.generateContent([
    { text: `Edit this image: ${prompt}` },
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageBase64,
      },
    },
  ]);
  
  return result.response.text(); // atau extract image dari response
}
```

## Alternative APIs (Jika Gemini Belum Support)

Jika beberapa fitur belum tersedia di Gemini, Anda bisa gunakan:

### 1. Stability AI (Stable Diffusion)
- Text-to-image
- Image-to-image
- API: https://platform.stability.ai/

### 2. Replicate
- Berbagai model AI (SDXL, AnimateDiff, dll)
- Pay per use
- API: https://replicate.com/

### 3. OpenAI DALL-E
- Text-to-image
- Image editing
- API: https://platform.openai.com/

### 4. ElevenLabs
- Text-to-speech (sangat natural)
- Voice cloning
- API: https://elevenlabs.io/

## Cara Test Gemini API

```bash
# Install Google AI SDK
npm install @google/generative-ai

# Test script
node test-gemini.js
```

```javascript
// test-gemini.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
  // Test text generation
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  const result = await model.generateContent('Hello, how are you?');
  console.log(result.response.text());
  
  // Test image generation (jika tersedia)
  try {
    const imagenModel = genAI.getGenerativeModel({ 
      model: 'imagen-3.0-generate-001' 
    });
    const imageResult = await imagenModel.generateContent({
      prompt: 'A beautiful sunset over mountains',
    });
    console.log('Image generation works!');
  } catch (error) {
    console.log('Image generation not available:', error.message);
  }
}

test();
```

## Rate Limits & Quotas

### Free Tier
- 60 requests per minute
- Limited features

### Paid Tier
- Higher rate limits
- Access to all models
- Priority processing

**Recommendation**: Untuk production dengan 500-1000 users, pastikan:
1. Upgrade ke paid tier
2. Implement proper rate limiting
3. Add queue system (sudah ada di code)
4. Monitor usage dan costs

## Troubleshooting

### Error: Model not found
- Check model name spelling
- Verify model availability di region Anda
- Check API key permissions

### Error: Quota exceeded
- Upgrade plan
- Implement better rate limiting
- Add user-facing error messages

### Error: Invalid image format
- Ensure image is base64 encoded
- Check mime type (image/jpeg, image/png)
- Verify image size limits

## Resources

- Gemini API Docs: https://ai.google.dev/gemini-api/docs
- Imagen Docs: https://ai.google.dev/gemini-api/docs/imagen
- Google AI Studio: https://makersuite.google.com/
- Pricing: https://ai.google.dev/pricing
- Community: https://discuss.ai.google.dev/

## Next Steps

1. Test Gemini API dengan key Anda
2. Verify fitur mana yang available
3. Update `gemini.service.ts` sesuai hasil test
4. Add proper error handling
5. Implement fallback strategies
6. Monitor usage dan costs
