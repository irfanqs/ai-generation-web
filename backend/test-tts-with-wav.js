const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
require('dotenv').config();

async function convertPCMtoWAV(pcmBuffer) {
  // Manual WAV header creation (more reliable)
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.length;
  
  // Create WAV header (44 bytes)
  const header = Buffer.alloc(44);
  
  // RIFF chunk descriptor
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  
  // fmt sub-chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  
  // data sub-chunk
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  
  // Combine header and PCM data
  return Buffer.concat([header, pcmBuffer]);
}

async function testTTS() {
  console.log('🧪 Testing Text-to-Speech with WAV Header\n');
  
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('🔑 API Key:', apiKey?.substring(0, 20) + '...\n');
  
  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey,
    });
    
    const text = 'Hello! This is a test of text to speech with proper WAV header. Have a wonderful day!';
    console.log('📝 Text:', text);
    console.log('🎤 Model: gemini-2.5-flash-preview-tts\n');
    
    console.log('📤 Generating speech...');
    const response = await ai.models.generateContent({
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
    
    console.log('✅ Response received!');
    
    const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (data) {
      const pcmBuffer = Buffer.from(data, 'base64');
      console.log('🎵 Raw PCM data length:', pcmBuffer.length, 'bytes');
      
      // Save raw PCM
      fs.writeFileSync('test-tts-raw.pcm', pcmBuffer);
      console.log('💾 Raw PCM saved as test-tts-raw.pcm');
      
      // Convert to WAV with header
      console.log('\n🔧 Converting PCM to WAV format...');
      const wavBuffer = await convertPCMtoWAV(pcmBuffer);
      console.log('✅ WAV conversion complete!');
      console.log('🎵 WAV file size:', wavBuffer.length, 'bytes');
      console.log('📊 Size increase:', wavBuffer.length - pcmBuffer.length, 'bytes (WAV header)');
      
      // Save WAV file
      fs.writeFileSync('test-tts-with-header.wav', wavBuffer);
      
      console.log('\n💾 Files created:');
      console.log('  - test-tts-raw.pcm (raw PCM from Gemini)');
      console.log('  - test-tts-with-header.wav (proper WAV file)');
      
      console.log('\n✅ ✅ ✅ SUCCESS! TTS with WAV header works!');
      console.log('\n🎧 You can now play test-tts-with-header.wav in any audio player');
    } else {
      console.log('❌ No audio data in response');
      console.log('Response:', JSON.stringify(response, null, 2));
    }
    
  } catch (error) {
    console.error('\n💥 ERROR:');
    console.error('Message:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
    
    console.error('\nFull error:', error);
  }
}

console.log('═══════════════════════════════════════════════════════');
console.log('    TEXT-TO-SPEECH TEST WITH WAV HEADER');
console.log('═══════════════════════════════════════════════════════\n');

testTTS().then(() => {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('              TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════════');
  process.exit(0);
});
