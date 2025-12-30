const axios = require('axios');

async function testAPI() {
  const baseURL = 'http://localhost:3001';
  
  console.log('🧪 Testing API Endpoint\n');
  
  // Step 1: Register or Login
  console.log('Step 1: Login...');
  let token;
  
  try {
    // Try to register
    const registerResponse = await axios.post(`${baseURL}/auth/register`, {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    });
    token = registerResponse.data.token;
    console.log('✅ Registered new user');
  } catch (error) {
    // If register fails, try login
    try {
      const loginResponse = await axios.post(`${baseURL}/auth/login`, {
        email: 'test@example.com',
        password: 'password123'
      });
      token = loginResponse.data.token;
      console.log('✅ Logged in existing user');
    } catch (loginError) {
      console.error('❌ Failed to login:', loginError.response?.data || loginError.message);
      return;
    }
  }
  
  console.log('🔑 Token:', token.substring(0, 20) + '...\n');
  
  // Step 2: Test text-to-image
  console.log('Step 2: Testing text-to-image endpoint...');
  console.log('Prompt: "A cute cat sitting on a chair"\n');
  
  try {
    const response = await axios.post(
      `${baseURL}/generation/text-to-image`,
      { prompt: 'A cute cat sitting on a chair' },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Request successful!');
    console.log('📦 Response:', JSON.stringify(response.data, null, 2));
    console.log('\n🎉 Generation started! Check backend logs for progress.');
    
  } catch (error) {
    console.error('❌ Request failed!');
    console.error('Status:', error.response?.status);
    console.error('Data:', JSON.stringify(error.response?.data, null, 2));
  }
}

console.log('═══════════════════════════════════════════════════════');
console.log('           API ENDPOINT TEST');
console.log('═══════════════════════════════════════════════════════\n');

testAPI().then(() => {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('              TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════════');
  setTimeout(() => process.exit(0), 1000);
});
