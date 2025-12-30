const axios = require('axios');
require('dotenv').config();

async function testWithDifferentPrompts() {
  const apiKey = process.env.GEMINI_API_KEY;
  const baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  const modelName = 'gemini-2.5-flash-image';
  
  const testCases = [
    { name: 'Normal prompt', prompt: 'A cute cat' },
    { name: 'Empty string', prompt: '' },
    { name: 'Undefined', prompt: undefined },
    { name: 'Null', prompt: null },
    { name: 'Long prompt', prompt: 'A beautiful landscape with mountains, rivers, and sunset' },
  ];
  
  for (const testCase of testCases) {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`Testing: ${testCase.name}`);
    console.log('Prompt:', testCase.prompt);
    console.log('═══════════════════════════════════════════════════════');
    
    try {
      const url = `${baseUrl}/models/${modelName}:generateContent?key=${apiKey}`;
      
      const requestBody = {
        contents: [{
          parts: [{ text: testCase.prompt }]
        }],
        generationConfig: {
          temperature: 1,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      };
      
      console.log('📤 Sending request...');
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await axios.post(url, requestBody, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      });
      
      console.log('✅ SUCCESS!');
      console.log('Response status:', response.status);
      
      if (response.data.candidates && response.data.candidates[0]) {
        const parts = response.data.candidates[0].content.parts;
        console.log('Parts count:', parts.length);
        
        parts.forEach((part, i) => {
          if (part.inlineData) {
            console.log(`  Part ${i}: Image (${part.inlineData.data.length} chars)`);
          } else if (part.text) {
            console.log(`  Part ${i}: Text (${part.text.substring(0, 50)}...)`);
          }
        });
      }
      
    } catch (error) {
      console.error('❌ FAILED!');
      console.error('Error:', error.message);
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
    }
  }
}

console.log('Testing Gemini API with different prompt types...\n');
testWithDifferentPrompts().then(() => {
  console.log('\n\nAll tests completed!');
  process.exit(0);
});
