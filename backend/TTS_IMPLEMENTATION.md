# 🎤 Text-to-Speech Implementation Guide

## Overview
Text-to-Speech (TTS) feature menggunakan Google Gemini API model `gemini-2.5-flash-preview-tts` dengan voice "Kore" yang cheerful.

---

## Technical Details

### Audio Format
- **Input:** Text string
- **Output:** WAV audio file
- **Sample Rate:** 24kHz
- **Bit Depth:** 16-bit
- **Channels:** Mono
- **Duration:** ~13 seconds per 100 words

### Processing Flow
```
User Input (Text)
    ↓
Gemini API (gemini-2.5-flash-preview-tts)
    ↓
Raw PCM Audio Data (no header)
    ↓
Add WAV Header (using 'wav' package)
    ↓
Upload to Cloudinary (as video resource)
    ↓
Store URL in Database
```

---

## Implementation

### 1. Gemini Service (`gemini.service.ts`)

```typescript
async textToSpeech(text: string): Promise<Buffer> {
  const response = await this.ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-tts',
    contents: [{ parts: [{ text: `Say cheerfully: ${text}` }] }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });
  
  const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return Buffer.from(data, 'base64');
}
```

**Key Points:**
- Returns raw PCM audio data (no WAV header)
- Voice: "Kore" (cheerful tone)
- Prefix prompt with "Say cheerfully:" for better results

---

### 2. WAV Conversion (`generation.processor.ts`)

```typescript
private async convertPCMtoWAV(pcmBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const tempPath = path.join('/tmp', `audio-${Date.now()}.wav`);
    
    const writer = new FileWriter(tempPath, {
      channels: 1,          // mono
      sampleRate: 24000,    // 24kHz
      bitDepth: 16,         // 16-bit
    });
    
    writer.on('finish', () => {
      setTimeout(() => {
        const wavBuffer = fs.readFileSync(tempPath);
        fs.unlinkSync(tempPath);
        resolve(wavBuffer);
      }, 100);
    });
    
    writer.write(pcmBuffer);
    writer.end();
  });
}
```

**Why WAV Header is Needed:**
- Gemini returns raw PCM data without file header
- Browsers and audio players need WAV header to play audio
- Cloudinary requires proper audio format for upload
- WAV header adds ~44 bytes to file size

---

### 3. Upload to Cloudinary

```typescript
const wavBuffer = await this.convertPCMtoWAV(audioBuffer);
const audioBase64 = wavBuffer.toString('base64');
const audioDataUri = `data:audio/wav;base64,${audioBase64}`;

outputUrl = await this.cloudinary.uploadBase64(audioDataUri, 'video');
```

**Note:** Cloudinary treats audio files as "video" resource type.

---

## Testing

### Test Script: `test-tts-with-wav.js`

```bash
cd backend
node test-tts-with-wav.js
```

**Expected Output:**
```
✅ Response received!
🎵 Raw PCM data length: 298126 bytes
🔧 Converting PCM to WAV format...
✅ WAV conversion complete!
🎵 WAV file size: 298170 bytes
📊 Size increase: 44 bytes (WAV header)
```

**Files Created:**
- `test-tts-raw.pcm` - Raw PCM from Gemini (no header)
- `test-tts-with-header.wav` - Proper WAV file (playable)

---

## Troubleshooting

### Issue: Audio not playing in browser
**Solution:** Ensure WAV header is added. Check file format:
```bash
file audio.wav
# Should show: RIFF (little-endian) data, WAVE audio, Microsoft PCM, 16 bit, mono 24000 Hz
```

### Issue: Cloudinary upload fails
**Error:** "Unsupported video format"  
**Solution:** 
1. Verify WAV header is present
2. Check file size (should be PCM size + 44 bytes)
3. Use 'video' resource type, not 'raw'

### Issue: Empty WAV file (0 bytes)
**Solution:** Add delay after writer.finish() event:
```typescript
writer.on('finish', () => {
  setTimeout(() => {
    const wavBuffer = fs.readFileSync(tempPath);
    resolve(wavBuffer);
  }, 100);
});
```

---

## API Usage

### Endpoint
```
POST /generation/text-to-speech
```

### Request Body
```json
{
  "prompt": "Hello! Welcome to our AI platform."
}
```

### Response
```json
{
  "id": "gen_123",
  "type": "text-to-speech",
  "status": "processing",
  "outputUrl": null,
  "createdAt": "2024-12-27T..."
}
```

### Poll for Result
```
GET /generation/:id
```

When complete:
```json
{
  "id": "gen_123",
  "type": "text-to-speech",
  "status": "completed",
  "outputUrl": "https://res.cloudinary.com/.../audio.wav",
  "createdAt": "2024-12-27T..."
}
```

---

## Performance

### Timing
- Gemini API call: ~3-5 seconds
- WAV conversion: ~100ms
- Cloudinary upload: ~1-2 seconds
- **Total:** ~5-10 seconds

### File Sizes
- Text length: 100 words
- PCM size: ~300KB
- WAV size: ~300KB + 44 bytes
- Cloudinary optimized: ~250KB

---

## Dependencies

```json
{
  "@google/genai": "^1.34.0",
  "wav": "^1.0.2",
  "cloudinary": "^2.8.0"
}
```

---

## Frontend Integration

### Dashboard Component
```typescript
const handleTTS = async () => {
  const response = await axios.post('/generation/text-to-speech', {
    prompt: text
  });
  
  // Poll for result
  const checkStatus = setInterval(async () => {
    const result = await axios.get(`/generation/${response.data.id}`);
    if (result.data.status === 'completed') {
      clearInterval(checkStatus);
      // Play or download audio
      window.open(result.data.outputUrl);
    }
  }, 2000);
};
```

---

## Best Practices

1. **Prompt Engineering:**
   - Add tone prefix: "Say cheerfully:", "Say professionally:", etc.
   - Keep text under 500 words for best results
   - Use proper punctuation for natural pauses

2. **Error Handling:**
   - Validate text length (max 5000 characters)
   - Handle Gemini API timeouts (60s)
   - Fallback to data URI if Cloudinary fails

3. **Performance:**
   - Use queue system for concurrent requests
   - Cache frequently used audio
   - Compress audio for web delivery

4. **User Experience:**
   - Show loading indicator (5-10s wait)
   - Allow audio preview before download
   - Provide download button

---

## Future Improvements

- [ ] Support multiple voices (Puck, Charon, Kore, Fenrir, Aoede)
- [ ] Add voice speed control
- [ ] Support SSML for advanced control
- [ ] Add audio preview player in UI
- [ ] Implement audio caching
- [ ] Support longer text (chunking)
- [ ] Add audio effects (pitch, speed)

---

## References

- [Gemini TTS Documentation](https://ai.google.dev/gemini-api/docs/audio)
- [WAV File Format](https://en.wikipedia.org/wiki/WAV)
- [Cloudinary Audio Upload](https://cloudinary.com/documentation/audio_transformations)

---

**Status:** ✅ Fully Implemented and Working  
**Last Updated:** December 27, 2024
