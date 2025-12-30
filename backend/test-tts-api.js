const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:3001';

async function testTTSAPI() {
  console.log('🧪 Testing TTS via API\n');
  
  try {
    // 1. Register or Login
    console.log('1️⃣ Logging in...');
    let token;
    
    try {
      const loginRes = await axios.post(`${API_URL}/auth/login`, {
        email: 'test@example.com',
        password: 'password123'
      });
      console.log('Login response:', loginRes.data);
      token = loginRes.data.access_token || loginRes.data.token;
      console.log('✅ Logged in successfully');
      console.log('🔑 Token:', token?.substring(0, 20) + '...');
    } catch (error) {
      console.log('⚠️  Login failed, trying to register...');
      const registerRes = await axios.post(`${API_URL}/auth/register`, {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      });
      console.log('Register response:', registerRes.data);
      token = registerRes.data.access_token || registerRes.data.token;
      console.log('✅ Registered successfully');
      console.log('🔑 Token:', token?.substring(0, 20) + '...');
    }
    
    if (!token) {
      throw new Error('Failed to get authentication token');
    }
    
    // 2. Generate TTS
    console.log('\n2️⃣ Generating TTS...');
    const text = 'Hello! This is a test of text to speech through the API. Have a wonderful day!';
    console.log('📝 Text:', text);
    
    const generateRes = await axios.post(
      `${API_URL}/generation/text-to-speech`,
      { prompt: text },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const generationId = generateRes.data.id;
    console.log('✅ Generation started, ID:', generationId);
    console.log('⏳ Status:', generateRes.data.status);
    
    // 3. Poll for completion
    console.log('\n3️⃣ Polling for completion...');
    let attempts = 0;
    let generation;
    
    while (attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
      
      const statusRes = await axios.get(
        `${API_URL}/generation/${generationId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      generation = statusRes.data;
      console.log(`   Attempt ${attempts}: ${generation.status}`);
      
      if (generation.status === 'completed') {
        console.log('✅ Generation completed!');
        break;
      }
      
      if (generation.status === 'failed') {
        console.log('❌ Generation failed!');
        console.log('Error:', generation.metadata);
        return;
      }
    }
    
    if (generation.status !== 'completed') {
      console.log('❌ Timeout waiting for completion');
      return;
    }
    
    // 4. Check result
    console.log('\n4️⃣ Result:');
    console.log('🎵 Output URL:', generation.outputUrl);
    
    if (generation.outputUrl.startsWith('http')) {
      console.log('✅ Audio uploaded to Cloudinary successfully!');
      console.log('🔗 You can access it at:', generation.outputUrl);
    } else if (generation.outputUrl.startsWith('data:audio')) {
      console.log('✅ Audio stored as data URI (fallback)');
      console.log('📊 Data URI length:', generation.outputUrl.length, 'characters');
    }
    
    console.log('\n✅ ✅ ✅ TTS API TEST SUCCESSFUL!');
    
  } catch (error) {
    console.error('\n💥 ERROR:');
    console.error('Message:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    
    console.error('\nFull error:', error);
  }
}

console.log('═══════════════════════════════════════════════════════');
console.log('         TTS API TEST');
console.log('═══════════════════════════════════════════════════════\n');

testTTSAPI().then(() => {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('              TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════════');
  process.exit(0);
});
