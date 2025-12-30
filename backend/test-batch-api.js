/**
 * Test script for Batch API
 * 
 * Usage: node test-batch-api.js
 */

const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testBatchAPI() {
  console.log('🧪 Testing Batch API...\n');

  try {
    // 1. Create inline batch requests
    console.log('1️⃣ Creating batch job with inline requests...');
    
    const inlinedRequests = [
      {
        contents: [{
          parts: [{ text: 'Generate a cute cartoon cat sitting on a pillow' }],
          role: 'user'
        }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        }
      },
      {
        contents: [{
          parts: [{ text: 'Generate a cute cartoon dog playing with a ball' }],
          role: 'user'
        }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        }
      }
    ];

    const batchJob = await ai.batches.create({
      model: 'gemini-2.5-flash-preview-image-generation',
      src: inlinedRequests,
      config: {
        displayName: 'test-batch-job-' + Date.now(),
      }
    });

    console.log('✅ Batch job created:', batchJob.name);
    console.log('📊 Initial state:', batchJob.state);

    // 2. Poll for completion
    console.log('\n2️⃣ Polling for completion...');
    
    const completedStates = new Set([
      'JOB_STATE_SUCCEEDED',
      'JOB_STATE_FAILED',
      'JOB_STATE_CANCELLED',
      'JOB_STATE_EXPIRED',
    ]);

    let currentJob = batchJob;
    let attempts = 0;
    const maxAttempts = 60; // 10 minutes max

    while (!completedStates.has(currentJob.state) && attempts < maxAttempts) {
      attempts++;
      console.log(`⏳ Attempt ${attempts}: State = ${currentJob.state}`);
      
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      currentJob = await ai.batches.get({ name: batchJob.name });
    }

    console.log(`\n✅ Final state: ${currentJob.state}`);

    // 3. Get results
    if (currentJob.state === 'JOB_STATE_SUCCEEDED') {
      console.log('\n3️⃣ Getting results...');
      
      if (currentJob.dest?.inlinedResponses) {
        console.log(`📊 Found ${currentJob.dest.inlinedResponses.length} responses`);
        
        for (let i = 0; i < currentJob.dest.inlinedResponses.length; i++) {
          const response = currentJob.dest.inlinedResponses[i];
          console.log(`\n--- Response ${i + 1} ---`);
          
          if (response.response?.candidates?.[0]?.content?.parts) {
            for (const part of response.response.candidates[0].content.parts) {
              if (part.text) {
                console.log('Text:', part.text.substring(0, 100) + '...');
              }
              if (part.inlineData) {
                console.log('Image:', part.inlineData.mimeType, '- Data length:', part.inlineData.data?.length || 0);
              }
            }
          } else if (response.error) {
            console.log('Error:', response.error);
          }
        }
      }
      
      if (currentJob.dest?.fileName) {
        console.log(`📁 Results in file: ${currentJob.dest.fileName}`);
      }
    } else {
      console.log('❌ Job did not succeed:', currentJob.state);
      if (currentJob.error) {
        console.log('Error:', currentJob.error);
      }
    }

    // 4. List all batch jobs
    console.log('\n4️⃣ Listing all batch jobs...');
    const jobs = [];
    for await (const job of await ai.batches.list()) {
      jobs.push({
        name: job.name,
        displayName: job.displayName,
        state: job.state,
      });
    }
    console.log(`Found ${jobs.length} batch jobs`);
    jobs.slice(0, 5).forEach(job => {
      console.log(`  - ${job.displayName}: ${job.state}`);
    });

    console.log('\n🎉 Batch API test completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// Run test
testBatchAPI();
