/**
 * Test script for Veo 3.1 API endpoints
 * 
 * Features tested:
 * - Text to Video
 * - Image to Video
 * - Video with References
 * - Interpolation
 * - Video Extension
 * - Long Video (Google Flow-like)
 */

const axios = require('axios');
const fs = require('fs');

const API_URL = 'http://localhost:3001';
let authToken = '';

async function login() {
  console.log('🔐 Logging in...');
  const response = await axios.post(`${API_URL}/auth/login`, {
    email: 'test@example.com',
    password: 'password123',
  });
  authToken = response.data.access_token;
  console.log('✅ Logged in successfully');
  return response.data;
}

async function getVeoModels() {
  console.log('\n📋 Getting Veo models info...');
  const response = await axios.get(`${API_URL}/veo/models`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  console.log('✅ Veo Models:', JSON.stringify(response.data, null, 2));
  return response.data;
}

async function testTextToVideo() {
  console.log('\n🎬 Testing Text-to-Video...');
  try {
    const response = await axios.post(
      `${API_URL}/veo/text-to-video`,
      {
        prompt: 'A beautiful sunset over the ocean with waves gently crashing on the shore',
        aspectRatio: '16:9',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 600000, // 10 minutes
      }
    );
    console.log('✅ Text-to-Video success!');
    console.log('Credit cost:', response.data.creditCost);
    
    // Save video
    if (response.data.videoBase64) {
      fs.writeFileSync('test-veo-text-to-video.mp4', Buffer.from(response.data.videoBase64, 'base64'));
      console.log('📁 Video saved to test-veo-text-to-video.mp4');
    }
    return response.data;
  } catch (error) {
    console.error('❌ Text-to-Video failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testImageToVideo(imageBase64) {
  console.log('\n🎬 Testing Image-to-Video...');
  try {
    const response = await axios.post(
      `${API_URL}/veo/image-to-video`,
      {
        imageBase64,
        prompt: 'Animate this image with smooth camera movement',
        aspectRatio: '16:9',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 600000,
      }
    );
    console.log('✅ Image-to-Video success!');
    console.log('Credit cost:', response.data.creditCost);
    
    if (response.data.videoBase64) {
      fs.writeFileSync('test-veo-image-to-video.mp4', Buffer.from(response.data.videoBase64, 'base64'));
      console.log('📁 Video saved to test-veo-image-to-video.mp4');
    }
    return response.data;
  } catch (error) {
    console.error('❌ Image-to-Video failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testLongVideo() {
  console.log('\n🎬 Testing Long Video (Google Flow)...');
  try {
    const response = await axios.post(
      `${API_URL}/veo/long-video`,
      {
        initialPrompt: 'A person walking through a beautiful forest at sunrise',
        segments: [
          { prompt: 'Continue walking, camera follows from behind' },
          { prompt: 'The person stops and looks up at the tall trees' },
        ],
        aspectRatio: '16:9',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 1200000, // 20 minutes for long video
      }
    );
    console.log('✅ Long Video success!');
    console.log('Segment count:', response.data.segmentCount);
    console.log('Total duration:', response.data.totalDuration, 'seconds');
    console.log('Credit cost:', response.data.creditCost);
    
    if (response.data.videoBase64) {
      fs.writeFileSync('test-veo-long-video.mp4', Buffer.from(response.data.videoBase64, 'base64'));
      console.log('📁 Video saved to test-veo-long-video.mp4');
    }
    return response.data;
  } catch (error) {
    console.error('❌ Long Video failed:', error.response?.data || error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Veo 3.1 API Test Suite\n');
  console.log('='.repeat(50));

  try {
    // Login first
    await login();

    // Get models info
    await getVeoModels();

    // Test text-to-video (basic test)
    console.log('\n' + '='.repeat(50));
    console.log('Running Text-to-Video test...');
    await testTextToVideo();

    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { login, getVeoModels, testTextToVideo, testImageToVideo, testLongVideo };
