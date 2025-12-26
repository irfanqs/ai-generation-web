# Implementasi Gemini API

## SDK yang Digunakan

**Package:** `@google/genai` (bukan `@google/generative-ai`)

```bash
npm install @google/genai
```

## Model yang Digunakan

### Text-to-Image & Image-to-Image
- **Model:** `gemini-2.5-flash-image`
- **Fitur:** Native image generation dari Gemini
- **Output:** Base64 image data

## Cara Kerja

### 1. Text-to-Image

```typescript
const response = await this.ai.models.generateContent({
  model: 'gemini-2.5-flash-image',
  contents: prompt,
});

// Extract base64 image
const imageBase64 = response.candidates[0].content.parts[0].inlineData.data;
```

### 2. Image-to-Image

```typescript
const response = await this.ai.models.generateContent({
  model: 'gemini-2.5-flash-image',
  contents: [
    {
      role: 'user',
      parts: [
        { text: prompt },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBase64, // base64 string
          },
        },
      ],
    },
  ],
});
```

## Flow Lengkap

### Text-to-Image Flow:
1. User submit prompt
2. Backend create generation record
3. Job masuk ke Bull Queue
4. Worker call `gemini.generateImage(prompt)`
5. Gemini return base64 image
6. Upload ke Cloudinary dengan data URI: `data:image/png;base64,{base64}`
7. Save Cloudinary URL ke database
8. User bisa download dari Cloudinary URL

### Image-to-Image Flow:
1. User upload image + prompt
2. Image di-upload ke Cloudinary (dapat URL)
3. Job masuk ke Bull Queue
4. Worker download image dari Cloudinary
5. Convert image ke base64
6. Call `gemini.editImage(base64, prompt)`
7. Gemini return edited image (base64)
8. Upload hasil ke Cloudinary
9. Save URL ke database

## Fitur yang Belum Diimplementasi

### Image-to-Video
- Status: Not implemented
- Reason: Perlu cek dokumentasi Gemini untuk model video
- Alternative: Bisa gunakan Runway ML atau Stability AI

### Text-to-Speech
- Status: Not implemented
- Reason: Gemini belum punya native TTS
- Alternative: Google Cloud Text-to-Speech API

## Cara Menambahkan Fitur Baru

### Contoh: Menambahkan Video Generation

```typescript
async generateVideo(imageBase64: string, prompt?: string): Promise<string> {
  const response = await this.ai.models.generateContent({
    model: 'gemini-video-model', // ganti dengan model yang benar
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt || 'Generate video from this image' },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: imageBase64,
            },
          },
        ],
      },
    ],
  });

  // Extract video data
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return part.inlineData.data; // base64 video
    }
  }

  throw new Error('No video generated');
}
```

## Testing

### Test Text-to-Image

```bash
# Buat file test
cat > backend/test-gemini.js << 'EOF'
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

async function test() {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  console.log('Testing text-to-image...');
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: 'A beautiful sunset over mountains',
  });

  console.log('Response:', response.candidates[0].content.parts[0]);
  
  if (response.candidates[0].content.parts[0].inlineData) {
    console.log('✅ Image generation works!');
  } else {
    console.log('❌ No image data received');
  }
}

test().catch(console.error);
EOF

# Run test
node backend/test-gemini.js
```

## Error Handling

### Common Errors

1. **API Key Invalid**
   ```
   Error: Invalid API key
   ```
   Solution: Check GEMINI_API_KEY di .env

2. **Model Not Found**
   ```
   Error: Model not found
   ```
   Solution: Verify model name, cek dokumentasi terbaru

3. **Quota Exceeded**
   ```
   Error: Quota exceeded
   ```
   Solution: Upgrade plan atau tunggu reset quota

4. **No Image Generated**
   ```
   Error: No image generated
   ```
   Solution: Check response structure, mungkin format berubah

## Resources

- Gemini API Docs: https://ai.google.dev/gemini-api/docs
- @google/genai NPM: https://www.npmjs.com/package/@google/genai
- Google AI Studio: https://makersuite.google.com/

## Changelog

- **2024-12-24**: Implementasi awal dengan `@google/genai`
- Model: `gemini-2.5-flash-image`
- Fitur: Text-to-image, Image-to-image
