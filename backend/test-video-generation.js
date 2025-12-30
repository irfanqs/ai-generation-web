const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

async function testVideoGeneration() {
  console.log('🧪 Testing Video Generation with Veo\n');
  
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('🔑 API Key:', apiKey?.substring(0, 20) + '...\n');
  
  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey,
    });
    
    const prompt = 'A cute cat playing with a ball of yarn';
    console.log('📝 Prompt:', prompt);
    console.log('🎬 Model: veo-3.1-generate-preview\n');
    
    console.log('📤 Starting video generation...');
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-generate-preview',
      prompt: prompt,
    });
    
    console.log('✅ Operation started!');
    console.log('📦 Operation ID:', operation.name);
    console.log('⏳ Waiting for completion...\n');
    
    // Poll the operation status
    let attempts = 0;
    const maxAttempts = 60; // 10 minutes max
    
    while (!operation.done && attempts < maxAttempts) {
      attempts++;
      console.log(`⏳ Attempt ${attempts}/${maxAttempts} - Waiting...`);
      await new Promise((resolve) => setTimeout(resolve, 10000)); // 10 seconds
      
      operation = await ai.operations.getVideosOperation({
        operation: operation,
      });
      
      if (operation.done) {
        console.log('\n✅ Video generation complete!');
        break;
      }
    }
    
    if (!operation.done) {
      console.log('\n⚠️ Timeout: Video generation taking too long');
      console.log('Operation can be checked later with ID:', operation.name);
      return;
    }
    
    // Check if we have the video
    if (operation.response && operation.response.generatedVideos) {
      console.log('🎉 Video generated successfully!');
      console.log('📦 Video info:', operation.response.generatedVideos[0]);
      
      // Try to download
      try {
        await ai.files.download({
          file: operation.response.generatedVideos[0].video,
          downloadPath: 'test-video.mp4',
        });
        console.log('💾 Video saved as test-video.mp4');
      } catch (downloadError) {
        console.log('⚠️ Could not download, but video URL:', operation.response.generatedVideos[0].video);
      }
    } else {
      console.log('❌ No video in response');
      console.log('Response:', JSON.stringify(operation.response, null, 2));
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
console.log('         VIDEO GENERATION TEST (VEO)');
console.log('═══════════════════════════════════════════════════════\n');

testVideoGeneration().then(() => {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('              TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════════');
  process.exit(0);
});
