const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

async function testImageGeneration() {
  console.log('🧪 Testing Image Generation\n');
  
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('🔑 API Key:', apiKey.substring(0, 20) + '...\n');
  
  const prompt = 'A cute cat sitting on a chair';
  console.log('📝 Prompt:', prompt);
  console.log('🎨 Model: gemini-2.5-flash-image\n');
  
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;
    
    console.log('📤 Sending request...');
    const response = await axios.post(url, {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 1,
        topK: 40,
        topP: 0.95,
      }
    });
    
    console.log('✅ Response received!\n');
    console.log('📦 Response structure:');
    console.log('  - candidates:', response.data.candidates?.length || 0);
    
    if (response.data.candidates && response.data.candidates[0]) {
      const candidate = response.data.candidates[0];
      console.log('  - parts:', candidate.content?.parts?.length || 0);
      
      if (candidate.content && candidate.content.parts) {
        candidate.content.parts.forEach((part, index) => {
          console.log(`\n📦 Part ${index}:`);
          console.log('  - Keys:', Object.keys(part));
          
          if (part.inlineData) {
            console.log('  ✅ Has inlineData!');
            console.log('  - mimeType:', part.inlineData.mimeType);
            console.log('  - data length:', part.inlineData.data?.length || 0);
            
            // Save image
            if (part.inlineData.data) {
              const buffer = Buffer.from(part.inlineData.data, 'base64');
              fs.writeFileSync('test-output.png', buffer);
              console.log('  💾 Image saved as test-output.png');
            }
          }
          
          if (part.text) {
            console.log('  📝 Text:', part.text.substring(0, 200));
          }
        });
      }
    }
    
    console.log('\n✅ ✅ ✅ SUCCESS! Image generation works!');
    
  } catch (error) {
    console.error('\n💥 ERROR:');
    console.error('Message:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

console.log('═══════════════════════════════════════════════════════');
console.log('         IMAGE GENERATION TEST');
console.log('═══════════════════════════════════════════════════════\n');

testImageGeneration().then(() => {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('              TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════════');
  process.exit(0);
});
