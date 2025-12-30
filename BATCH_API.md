# Batch API Implementation

## Overview

Batch API Google Gemini telah diimplementasikan untuk platform kita. Fitur ini memungkinkan pemrosesan volume besar request secara asynchronous dengan **50% lebih murah** dari standard API.

---

## 🎯 Keuntungan Batch API

| Aspek | Standard API | Batch API |
|-------|-------------|-----------|
| **Harga** | 100% | **50%** (hemat 50%) |
| **Response Time** | Real-time | Hingga 24 jam (biasanya lebih cepat) |
| **Use Case** | Interaktif | Bulk processing |
| **Rate Limit** | Standard | Higher throughput |

---

## 💰 Credit Costs Comparison

| Feature | Standard | Batch | Savings |
|---------|----------|-------|---------|
| Character Creation | 4 credits/pose | 2 credits/pose | 50% |
| Food Photography | 4 credits/style | 2 credits/style | 50% |
| Product with Model | 5 credits/pose | 2.5 credits/pose | 50% |
| Text to Image | 4 credits/image | 2 credits/image | 50% |

### Example Savings

**Character Creation (10 poses)**:
- Standard: 10 × 4 = 40 credits
- Batch: 10 × 2 = **20 credits** (hemat 20 credits!)

**Food Ultimate Pack (20 styles)**:
- Standard: 20 × 4 = 80 credits
- Batch: 20 × 2 = **40 credits** (hemat 40 credits!)

---

## 🔧 Backend Implementation

### Files Created

```
backend/src/generation/
├── batch.service.ts      # Core batch API service
├── batch.controller.ts   # REST API endpoints
├── batch.processor.ts    # Queue processor for batch jobs
```

### Batch Service Methods

```typescript
// Create image batch job
createImageBatchJob(requests: BatchRequest[], displayName: string)

// Create text batch job
createTextBatchJob(requests: BatchRequest[], displayName: string, model?: string)

// Get job status
getBatchJobStatus(jobName: string)

// Get job results
getBatchJobResults(jobName: string)

// Wait for job completion (polling)
waitForBatchJob(jobName: string, pollIntervalMs?: number, maxWaitMs?: number)

// Cancel job
cancelBatchJob(jobName: string)

// Delete job
deleteBatchJob(jobName: string)

// List all jobs
listBatchJobs()
```

### API Endpoints

#### Create Batch Job
```bash
POST /batch/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "character" | "food" | "product",
  "requests": [
    {
      "prompt": "Generate character in front pose",
      "imageBase64": "optional base64 image"
    },
    {
      "prompt": "Generate character in side pose"
    }
  ],
  "displayName": "optional job name"
}
```

Response:
```json
{
  "id": "generation-uuid",
  "status": "pending",
  "type": "batch-character",
  "requestCount": 2,
  "creditCost": 4,
  "message": "Batch job created. Processing may take up to 24 hours (usually much faster)."
}
```

#### Get Batch Status
```bash
GET /batch/status/:id
Authorization: Bearer <token>
```

Response:
```json
{
  "id": "generation-uuid",
  "status": "completed",
  "type": "batch-character",
  "createdAt": "2024-12-30T10:00:00Z",
  "results": [
    "https://cloudinary.com/image1.jpg",
    "https://cloudinary.com/image2.jpg"
  ],
  "errors": [],
  "successCount": 2,
  "failCount": 0,
  "requestCount": 2
}
```

#### Get Batch History
```bash
GET /batch/history
Authorization: Bearer <token>
```

Response:
```json
[
  {
    "id": "generation-uuid",
    "status": "completed",
    "type": "batch-character",
    "createdAt": "2024-12-30T10:00:00Z",
    "requestCount": 10,
    "successCount": 10,
    "creditCost": 20
  }
]
```

---

## 🔄 Job States

| State | Description |
|-------|-------------|
| `JOB_STATE_PENDING` | Job queued, waiting to start |
| `JOB_STATE_RUNNING` | Job is being processed |
| `JOB_STATE_SUCCEEDED` | Job completed successfully |
| `JOB_STATE_FAILED` | Job failed |
| `JOB_STATE_CANCELLED` | Job was cancelled |
| `JOB_STATE_EXPIRED` | Job expired |

---

## 📊 Processing Flow

```
1. User submits batch request
   ↓
2. Credits deducted (50% rate)
   ↓
3. Generation record created (status: pending)
   ↓
4. Job added to Bull queue
   ↓
5. BatchProcessor picks up job
   ↓
6. Batch job created via Gemini API
   ↓
7. Poll for completion (every 30s, max 2 hours)
   ↓
8. Results retrieved
   ↓
9. Images uploaded to Cloudinary
   ↓
10. Generation record updated with results
```

---

## 🧪 Testing

### Test Batch API
```bash
cd backend
node test-batch-api.js
```

### Test via cURL
```bash
# Login first
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' | jq -r '.token')

# Create batch job
curl -X POST http://localhost:3001/batch/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "character",
    "requests": [
      {"prompt": "Anime girl with blue hair, front pose"},
      {"prompt": "Anime girl with blue hair, side pose"}
    ]
  }'

# Check status
curl http://localhost:3001/batch/status/<generation-id> \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🎨 Frontend Integration

### Example: Character Creation with Batch

```typescript
// When user selects multiple poses
const handleBatchGenerate = async () => {
  const requests = selectedPoses.map(pose => ({
    prompt: `${characterDescription}, ${pose} pose, ${style} style`,
  }));

  try {
    const response = await axios.post('/batch/create', {
      type: 'character',
      requests,
    });

    // Show pending state
    setBatchJobId(response.data.id);
    setStatus('processing');

    // Poll for completion
    pollBatchStatus(response.data.id);
  } catch (error) {
    toast.error(error.response?.data?.message || 'Failed to create batch job');
  }
};

const pollBatchStatus = async (jobId: string) => {
  const interval = setInterval(async () => {
    const status = await axios.get(`/batch/status/${jobId}`);
    
    if (status.data.status === 'completed') {
      clearInterval(interval);
      setResults(status.data.results);
      setStatus('completed');
    } else if (status.data.status === 'failed') {
      clearInterval(interval);
      setStatus('failed');
      toast.error('Batch job failed');
    }
  }, 10000); // Poll every 10 seconds
};
```

---

## 📋 Best Practices

### When to Use Batch API

✅ **Use Batch API for:**
- Character creation with multiple poses (3+ poses)
- Food photography with multiple styles (3+ styles)
- Product photos with multiple poses (3+ poses)
- Bulk image generation
- Non-urgent processing

❌ **Don't use Batch API for:**
- Single image generation
- Real-time/interactive features
- Time-sensitive requests
- Preview/draft generation

### Optimal Batch Sizes

| Feature | Recommended Batch Size |
|---------|----------------------|
| Character | 5-10 poses |
| Food | 5-20 styles |
| Product | 5-10 poses |
| General | 10-20 requests |

### Error Handling

```typescript
// Always handle partial failures
if (status.data.failCount > 0) {
  console.log(`${status.data.failCount} requests failed`);
  console.log('Errors:', status.data.errors);
}

// Show successful results even if some failed
if (status.data.successCount > 0) {
  setResults(status.data.results);
}
```

---

## 🔒 Security

- ✅ JWT authentication required
- ✅ NonAdminGuard blocks admin accounts
- ✅ Credit validation before job creation
- ✅ User can only access their own batch jobs
- ✅ Maximum 20 requests per batch (configurable)

---

## 📈 Monitoring

### Admin Dashboard

Batch jobs are tracked in the Generation table with type prefix `batch-`:
- `batch-character`
- `batch-food`
- `batch-product`

### Metadata Stored

```json
{
  "batchJobName": "batches/123456",
  "requestCount": 10,
  "type": "character",
  "results": ["url1", "url2", ...],
  "errors": ["error1", ...],
  "successCount": 9,
  "failCount": 1,
  "creditCost": 20
}
```

---

## 🚀 Future Enhancements

1. **Webhook notifications** - Notify user when batch completes
2. **Email notifications** - Send email with results
3. **Batch scheduling** - Schedule batch jobs for off-peak hours
4. **Priority queue** - Premium users get faster processing
5. **Batch templates** - Save and reuse batch configurations
6. **Partial results** - Stream results as they complete

---

## 📚 References

- [Google Gemini Batch API Documentation](https://ai.google.dev/gemini-api/docs/batch-api)
- [Batch API Cookbook](https://ai.google.dev/gemini-api/docs/batch-api-cookbook)

---

**Last Updated**: December 30, 2024
**Status**: ✅ Implemented
