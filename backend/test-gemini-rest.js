const axios = require('axios');
require('dotenv').config();

async function testImagen() {
  console.log('🧪 Testing Gemini Imagen API (REST)\n');
  
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in .env file');
    return;
  }
  
  console.log('🔑 API Key:', apiKey.substring(0, 20) + '...\n');
  
  // Test 1: Try Imagen 3
  console.log('📤 Test 1: Trying Imagen 3.0...');
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`;
    
    const response = await axios.post(url, {
      instances: [{ prompt: 'A cute cat sitting on a chair' }],
      parameters: { sampleCount: 1 }
    });
    
    console.log('✅ Imagen 3.0 works!');
    console.log('📦 Response:', JSON.stringify(response.data, null, 2));
    return;
  } catch (error) {
    console.log('❌ Imagen 3.0 failed:', error.response?.status, error.response?.data?.error?.message || error.message);
  }
  
  // Test 2: Try text generation to verify API key
  console.log('\n📤 Test 2: Verifying API key with text generation...');
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: 'Say hello' }] }]
    });
    
    console.log('✅ API Key is valid!');
    console.log('📝 Response:', response.data.candidates[0].content.parts[0].text);
  } catch (error) {
    console.log('❌ API Key verification failed:', error.response?.status, error.response?.data?.error?.message || error.message);
  }
  
  // Test 3: List available models
  console.log('\n📤 Test 3: Listing available models...');
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    const response = await axios.get(url);
    
    console.log('✅ Available models:');
    response.data.models.forEach(model => {
      if (model.name.includes('imagen') || model.name.includes('image')) {
        console.log('  🎨', model.name, '-', model.displayName);
      }
    });
  } catch (error) {
    console.log('❌ Failed to list models:', error.response?.status, error.response?.data?.error?.message || error.message);
  }
}

console.log('═══════════════════════════════════════════════════════');
console.log('        GEMINI REST API TEST');
console.log('═══════════════════════════════════════════════════════\n');

testImagen().then(() => {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('              TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════════');
  process.exit(0);
}).catch((err) => {
  console.error('\n💥 Unhandled error:', err);
  process.exit(1);
});
