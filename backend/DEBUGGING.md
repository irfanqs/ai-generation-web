# Debugging Guide

## Logging yang Sudah Ditambahkan

Sekarang setiap step dalam proses generation akan menampilkan log dengan emoji untuk mudah dibaca:

### Log Symbols
- 🚀 = Process started
- ✅ = Success
- ❌ = Error/Failed
- 💥 = Exception
- 📝 = Prompt/Text
- 🎨 = Image generation
- ✏️ = Image editing
- 🎬 = Video generation
- 🎤 = Text-to-speech
- ☁️ = Cloudinary operation
- 📥 = Incoming request
- 📤 = Upload
- 💰 = Credits
- 🔗 = URL
- 📦 = Data/Package
- 📋 = Job info

## Cara Melihat Logs

### 1. Backend Terminal
Jalankan backend dengan:
```bash
cd backend
npm run start:dev
```

Semua log akan muncul di terminal ini.

### 2. Contoh Log Flow untuk Text-to-Image

```
📥 [GenerationService] New generation request
👤 [GenerationService] User ID: abc123
🎯 [GenerationService] Type: text-to-image
📝 [GenerationService] Prompt: A beautiful sunset
💰 [GenerationService] User credits: 100
✅ [GenerationService] Generation record created: gen123
📮 [GenerationService] Adding job to queue...
✅ [GenerationService] Job added to queue
✅ [GenerationService] Credits decremented

🚀 [Processor] Starting generation job
📋 [Processor] Job ID: 1
🔖 [Processor] Generation ID: gen123
🎯 [Processor] Type: text-to-image
📝 [Processor] Prompt: A beautiful sunset
✅ [Processor] Status updated to processing

🎨 [Processor] Processing text-to-image...
🎨 [GeminiService] Starting image generation...
📝 [GeminiService] Prompt: A beautiful sunset
✅ [GeminiService] Received response from Gemini
📦 [GeminiService] Response structure: {...}
🖼️ [GeminiService] Image data found, length: 123456
✅ [Processor] Image generated, uploading to Cloudinary...

☁️ [Cloudinary] Starting base64 upload...
📦 [Cloudinary] Resource type: image
📏 [Cloudinary] Data length: 123456
✅ [Cloudinary] Upload successful!
🔗 [Cloudinary] URL: https://res.cloudinary.com/...
✅ [Processor] Uploaded to Cloudinary: https://...

💾 [Processor] Updating database with result...
✅ [Processor] Generation completed successfully!
```

## Common Errors & Solutions

### 1. Gemini API Error
```
💥 [GeminiService] Error generating image: API key invalid
```
**Solution:** Check GEMINI_API_KEY di .env

### 2. No Image Data
```
❌ [GeminiService] No image data in response
📦 [GeminiService] Response structure: {...}
```
**Solution:** 
- Check response structure di log
- Model mungkin tidak support image generation
- Verify model name: `gemini-2.5-flash-image`

### 3. Cloudinary Upload Failed
```
💥 [Cloudinary] Upload failed: Invalid signature
```
**Solution:** Check Cloudinary credentials di .env

### 4. Queue Not Processing
```
✅ [GenerationService] Job added to queue
(no processor logs)
```
**Solution:** 
- Check Redis is running: `redis-cli ping`
- Restart backend

### 5. Credits Issue
```
❌ [GenerationService] Insufficient credits
```
**Solution:** Add credits to user in database

## Checking Database

### View Generation Status
```bash
cd backend
npx prisma studio
```

Atau via psql:
```bash
psql -U aiuser -d aiplatform -h localhost -c "SELECT id, type, status, metadata FROM \"Generation\" ORDER BY \"createdAt\" DESC LIMIT 5;"
```

### View Failed Generations with Error
```bash
psql -U aiuser -d aiplatform -h localhost -c "SELECT id, type, prompt, status, metadata FROM \"Generation\" WHERE status = 'failed' ORDER BY \"createdAt\" DESC LIMIT 5;"
```

## Testing Gemini API Directly

Create test file:
```bash
cat > backend/test-gemini-direct.js << 'EOF'
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

async function test() {
  console.log('🧪 Testing Gemini API...');
  console.log('🔑 API Key:', process.env.GEMINI_API_KEY?.substring(0, 10) + '...');
  
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  try {
    console.log('📤 Sending request to Gemini...');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: 'A cute cat sitting on a chair',
    });

    console.log('✅ Response received!');
    console.log('📦 Full response:', JSON.stringify(response, null, 2));
    
    if (response.candidates && response.candidates[0]) {
      const parts = response.candidates[0].content.parts;
      console.log('📋 Parts count:', parts.length);
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        console.log(`\n📦 Part ${i}:`, Object.keys(part));
        
        if (part.inlineData) {
          console.log('✅ Found image data!');
          console.log('📏 Data length:', part.inlineData.data.length);
          console.log('🎨 Mime type:', part.inlineData.mimeType);
        }
        
        if (part.text) {
          console.log('📝 Text:', part.text);
        }
      }
    }
  } catch (error) {
    console.error('💥 Error:', error.message);
    console.error('📊 Full error:', error);
  }
}

test();
EOF

node backend/test-gemini-direct.js
```

## Monitoring Queue

### Check Queue Status
```bash
# In Node.js console or create a script
cd backend
node -e "
const Redis = require('ioredis');
const redis = new Redis();
redis.llen('bull:generation:wait', (err, len) => {
  console.log('Jobs waiting:', len);
  redis.llen('bull:generation:active', (err, len) => {
    console.log('Jobs active:', len);
    redis.llen('bull:generation:failed', (err, len) => {
      console.log('Jobs failed:', len);
      redis.quit();
    });
  });
});
"
```

## Enable More Detailed Logging

### Add to .env
```
LOG_LEVEL=debug
```

### Check NestJS Logs
NestJS automatically logs HTTP requests. You should see:
```
[Nest] 12345  - 12/24/2024, 2:00:00 PM     LOG [RouterExplorer] Mapped {/generation/text-to-image, POST} route
```

## Quick Troubleshooting Checklist

- [ ] Backend running? Check terminal
- [ ] Redis running? `redis-cli ping` should return PONG
- [ ] PostgreSQL running? `psql -U aiuser -d aiplatform -h localhost -c "SELECT 1;"`
- [ ] Gemini API key valid? Check .env
- [ ] Cloudinary credentials valid? Check .env
- [ ] User has credits? Check database
- [ ] Check backend logs for errors
- [ ] Check generation status in database
- [ ] Check metadata field for error details

## Getting Help

If you see an error, copy:
1. The full log output from backend terminal
2. The generation record from database (including metadata)
3. The exact prompt you used
4. Your Gemini model name

This will help diagnose the issue quickly!
