// Test TTS method directly without queue
require('dotenv').config();

// Simulate NestJS environment
process.env.NODE_ENV = 'development';

async function testDirectMethod() {
  console.log('🧪 Testing TTS method directly\n');
  
  // Import after env is loaded
  const { GoogleGenAI } = require('@google/genai');
  
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('🔑 API Key:', apiKey?.substring(0, 20) + '...\n');
  
  const ai = new GoogleGenAI({
    apiKey: apiKey,
  });
  
  const text = 'Hello! This is a direct method test.';
  console.log('📝 Text:', text);
  console.log('🎤 Calling generateContent...\n');
  
  try {
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
    console.log('📊 Response structure:');
    console.log('  - hasCandidates:', !!response.candidates);
    console.log('  - candidatesLength:', response.candidates?.length);
    console.log('  - hasContent:', !!response.candidates?.[0]?.content);
    console.log('  - hasParts:', !!response.candidates?.[0]?.content?.parts);
    console.log('  - partsLength:', response.candidates?.[0]?.content?.parts?.length);
    
    if (response.candidates?.[0]?.content?.parts?.[0]) {
      const firstPart = response.candidates[0].content.parts[0];
      console.log('  - firstPartKeys:', Object.keys(firstPart));
      
      if (firstPart.inlineData) {
        console.log('  - hasInlineData: true');
        console.log('  - inlineDataKeys:', Object.keys(firstPart.inlineData));
        console.log('  - hasData:', !!firstPart.inlineData.data);
        
        if (firstPart.inlineData.data) {
          const audioBuffer = Buffer.from(firstPart.inlineData.data, 'base64');
          console.log('  - audioBufferSize:', audioBuffer.length);
          console.log('\n✅ ✅ ✅ SUCCESS! Audio data found!');
        } else {
          console.log('\n❌ inlineData.data is empty');
        }
      } else {
        console.log('  - hasInlineData: false');
        console.log('\n❌ No inlineData in first part');
        console.log('First part:', JSON.stringify(firstPart, null, 2));
      }
    } else {
      console.log('\n❌ No parts in response');
      console.log('Full response:', JSON.stringify(response, null, 2));
    }
    
  } catch (error) {
    console.error('\n💥 ERROR:');
    console.error('Message:', error.message);
    console.error('\nFull error:', error);
  }
}

console.log('═══════════════════════════════════════════════════════');
console.log('       TTS DIRECT METHOD TEST');
console.log('═══════════════════════════════════════════════════════\n');

testDirectMethod().then(() => {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('              TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════════');
  process.exit(0);
});
