const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
require('dotenv').config();

async function testTTS() {
  console.log('🧪 Testing Text-to-Speech\n');
  
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('🔑 API Key:', apiKey?.substring(0, 20) + '...\n');
  
  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey,
    });
    
    const text = 'Hello! This is a test of text to speech. Have a wonderful day!';
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
      const audioBuffer = Buffer.from(data, 'base64');
      console.log('🎵 Audio data length:', audioBuffer.length);
      
      // Save as raw audio
      fs.writeFileSync('test-tts.wav', audioBuffer);
      console.log('💾 Audio saved as test-tts.wav');
      
      console.log('\n✅ ✅ ✅ SUCCESS! TTS works!');
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
console.log('         TEXT-TO-SPEECH TEST');
console.log('═══════════════════════════════════════════════════════\n');

testTTS().then(() => {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('              TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════════');
  process.exit(0);
});
