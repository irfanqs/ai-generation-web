const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

async function test() {
  console.log('🧪 Quick Gemini API Test\n');
  console.log('🔑 API Key:', process.env.GEMINI_API_KEY?.substring(0, 20) + '...\n');
  
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  try {
    console.log('📤 Sending request to Gemini...');
    console.log('🎨 Model: gemini-2.5-flash-image');
    console.log('📝 Prompt: A cute cat sitting on a chair\n');
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: 'A cute cat sitting on a chair',
    });

    console.log('✅ Response received!\n');
    
    if (response.candidates && response.candidates[0]) {
      const parts = response.candidates[0].content.parts;
      console.log('📋 Response has', parts.length, 'part(s)\n');
      
      let foundImage = false;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        
        if (part.inlineData) {
          foundImage = true;
          console.log('✅ ✅ ✅ SUCCESS! Image data found!');
          console.log('📏 Data length:', part.inlineData.data.length, 'characters');
          console.log('🎨 Mime type:', part.inlineData.mimeType);
          console.log('\n🎉 Your Gemini API is working correctly!\n');
        }
        
        if (part.text) {
          console.log('📝 Text response:', part.text);
        }
      }
      
      if (!foundImage) {
        console.log('❌ No image data found in response');
        console.log('📦 Response structure:', JSON.stringify(response, null, 2));
      }
    } else {
      console.log('❌ No candidates in response');
      console.log('📦 Full response:', JSON.stringify(response, null, 2));
    }
  } catch (error) {
    console.error('\n💥 ERROR occurred:');
    console.error('Message:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    console.error('\n📊 Full error object:');
    console.error(error);
  }
}

console.log('═══════════════════════════════════════════════════════');
console.log('           GEMINI API QUICK TEST');
console.log('═══════════════════════════════════════════════════════\n');

test().then(() => {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('                  TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════════');
  process.exit(0);
}).catch((err) => {
  console.error('\n💥 Unhandled error:', err);
  process.exit(1);
});
