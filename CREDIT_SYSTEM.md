# Credit System Documentation

## Overview
Sistem kredit yang sophisticated berdasarkan estimasi cost API Gemini dan kompleksitas fitur. Setiap fitur memiliki credit cost yang berbeda sesuai dengan resource yang digunakan.

## Credit Cost Structure

### Base Conversion
- **1 Credit = $0.01 USD**
- Margin: 2-3x dari actual API cost untuk cover operational expenses

### Cost per Feature

#### 1. Text to Image (Imagen 3)
- **Cost**: 4 credits per image
- **API Cost**: ~$0.04 per image
- **Use Case**: Generate image dari text prompt

#### 2. Image to Image (Imagen 3 Edit)
- **Cost**: 4 credits per image
- **API Cost**: ~$0.04 per image
- **Use Case**: Transform atau edit existing image

#### 3. Image to Video (Veo 3)
- **Base Cost**: 10 credits
- **Duration Multiplier**:
  - 5 seconds: 10 credits (1x)
  - 10 seconds: 15 credits (1.5x)
  - 15 seconds: 20 credits (2x)
- **API Cost**: ~$0.10 per video
- **Use Case**: Generate video dari image dengan prompt

#### 4. Text to Video (Veo 3)
- **Base Cost**: 12 credits
- **Duration Multiplier**:
  - 5 seconds: 12 credits (1x)
  - 10 seconds: 18 credits (1.5x)
  - 15 seconds: 24 credits (2x)
- **API Cost**: ~$0.12 per video
- **Use Case**: Generate video dari text prompt (lebih mahal karena generate dari scratch)

#### 5. Text to Speech (Gemini TTS)
- **Base Cost**: 1 credit
- **Character Multiplier**: +0.5 credit per 1000 characters
- **Examples**:
  - 500 chars: 1 credit
  - 1500 chars: 2 credits (1 + 0.5)
  - 3000 chars: 2 credits (1 + 1)
- **API Cost**: ~$0.016 per 1M characters
- **Use Case**: Convert text ke audio

#### 6. Character Creation
- **Cost**: 4 credits per pose
- **Batch**: Multiple poses × 4 credits each
- **Example**: 5 poses = 20 credits
- **Use Case**: Generate character dengan berbagai pose

#### 7. Food Photography
- **Cost**: 4 credits per style
- **Batch**: Multiple styles × 4 credits each
- **Ultimate Pack**: 20 styles = 80 credits
- **Use Case**: Generate food photography dengan berbagai style

#### 8. Product with Model
- **Cost**: 5 credits per pose
- **Batch**: Multiple poses × 5 credits each
- **Example**: 10 poses = 50 credits
- **Use Case**: Generate product dengan model (lebih kompleks)

#### 9. Video Scene Creator (Veo Prompter)
- **Cost**: 10 credits per scene
- **Batch**: Multiple scenes × 10 credits each
- **Example**: 4 scenes = 40 credits
- **Use Case**: Generate video scenes untuk storytelling

## Credit Calculation Logic

### Backend Implementation
```typescript
import { calculateCreditCost } from './credit-costs.config';

// Example 1: Text to Image
const cost1 = calculateCreditCost('text-to-image');
// Result: 4 credits

// Example 2: Image to Video (10 seconds)
const cost2 = calculateCreditCost('image-to-video', {
  duration: '10s'
});
// Result: 15 credits

// Example 3: Text to Speech (2500 characters)
const cost3 = calculateCreditCost('text-to-speech', {
  textLength: 2500
});
// Result: 2 credits (1 base + 1 for 2000 chars)

// Example 4: Character Creation (5 poses)
const cost4 = calculateCreditCost('character-creation', {
  count: 5
});
// Result: 20 credits (4 × 5)
```

### API Endpoint
```bash
# Get all credit costs
GET /generation/credit-costs

# Get specific feature cost
GET /generation/credit-cost/:type
```

Response:
```json
{
  "base": 4,
  "description": "Generate image dari text prompt",
  "details": ""
}
```

## Credit Packages

### Available Packages
| Package | Credits | Price | Per Credit | Discount |
|---------|---------|-------|------------|----------|
| Starter | 100 | $10 | $0.10 | 0% |
| Pro | 500 | $40 | $0.08 | 20% |
| Business | 1000 | $70 | $0.07 | 30% |
| Enterprise | 5000 | $300 | $0.06 | 40% |

### Usage Examples

#### Starter Package ($10 = 100 credits)
- 25 images (text-to-image)
- 10 videos 5s (image-to-video)
- 100 TTS requests (short text)
- 5 character sets (5 poses each)

#### Pro Package ($40 = 500 credits)
- 125 images
- 50 videos 5s
- 500 TTS requests
- 25 character sets

#### Business Package ($70 = 1000 credits)
- 250 images
- 100 videos 5s
- 1000 TTS requests
- 50 character sets

## Implementation Details

### Database Schema
```prisma
model Generation {
  id          String   @id @default(uuid())
  userId      String
  type        String
  prompt      String?
  inputUrl    String?
  outputUrl   String
  status      String   @default("pending")
  metadata    Json?    // Stores creditCost and other info
  createdAt   DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id])
}
```

### Credit Deduction Flow
1. User initiates generation request
2. Backend calculates credit cost based on type and options
3. Check if user has sufficient credits
4. If yes:
   - Create generation record with creditCost in metadata
   - Deduct credits from user balance
   - Add job to queue
5. If no:
   - Return error with required vs available credits

### Error Handling
```typescript
if (user.credits < creditCost) {
  throw new BadRequestException(
    `Insufficient credits. Required: ${creditCost}, Available: ${user.credits}`
  );
}
```

## Frontend Integration

### Display Credit Cost
```typescript
// Fetch credit cost info
const response = await axios.get('/generation/credit-cost/text-to-image');
console.log(response.data);
// { base: 4, description: "Generate image dari text prompt" }
```

### Show Cost Before Generation
```tsx
<div className="text-sm text-gray-600">
  Cost: {creditCost} credits
</div>
```

### Calculate Dynamic Cost
```typescript
// For video with duration
const duration = '10s';
const baseCost = 10;
const multiplier = duration === '10s' ? 1.5 : 1;
const totalCost = Math.ceil(baseCost * multiplier);

// For batch operations
const poseCount = 5;
const costPerPose = 4;
const totalCost = poseCount * costPerPose;
```

## Admin Features

### Monitor Credit Usage
- View total credits consumed per user
- Track which features consume most credits
- Analyze credit usage patterns

### Adjust User Credits
- Add credits manually via admin dashboard
- Refund credits for failed generations
- Bonus credits for promotions

### Credit Analytics
```sql
-- Total credits consumed
SELECT SUM((metadata->>'creditCost')::int) as total_credits
FROM generations
WHERE status = 'completed';

-- Credits per feature type
SELECT type, SUM((metadata->>'creditCost')::int) as credits
FROM generations
WHERE status = 'completed'
GROUP BY type;

-- Top users by credit consumption
SELECT u.email, SUM((g.metadata->>'creditCost')::int) as credits
FROM users u
JOIN generations g ON g."userId" = u.id
WHERE g.status = 'completed'
GROUP BY u.email
ORDER BY credits DESC
LIMIT 10;
```

## Best Practices

### For Users
1. **Check credit cost** before generating
2. **Start with shorter durations** for videos
3. **Use batch operations** efficiently (e.g., select only needed poses)
4. **Monitor credit balance** regularly

### For Developers
1. **Always calculate cost** before deducting credits
2. **Store creditCost** in generation metadata for tracking
3. **Handle insufficient credits** gracefully
4. **Log credit transactions** for audit trail
5. **Refund credits** if generation fails

### For Business
1. **Review pricing** quarterly based on actual API costs
2. **Adjust margins** based on operational costs
3. **Offer promotions** strategically (bonus credits, discounts)
4. **Monitor abuse** (excessive usage patterns)

## Cost Optimization Tips

### For Platform
1. **Batch API requests** when possible
2. **Cache common generations** (if applicable)
3. **Optimize prompts** to reduce API calls
4. **Use cheaper models** for preview/draft modes

### For Users
1. **Test with shorter videos** first
2. **Refine prompts** before final generation
3. **Use appropriate quality** settings
4. **Buy larger packages** for better rates

## Future Enhancements

### Planned Features
1. **Credit history** - Detailed transaction log
2. **Credit expiry** - Time-limited credits for promotions
3. **Subscription plans** - Monthly credit allocation
4. **Referral credits** - Bonus credits for referrals
5. **Usage analytics** - Personal credit usage dashboard
6. **Auto-refill** - Automatic credit purchase when low
7. **Credit sharing** - Team/organization credit pools

### API Improvements
1. **Estimate endpoint** - Calculate cost before generation
2. **Bulk operations** - Optimized pricing for batch requests
3. **Priority queue** - Premium credits for faster processing
4. **Credit rollover** - Unused subscription credits carry over

## Troubleshooting

### "Insufficient credits" Error
- Check current balance: `GET /auth/me`
- View credit cost: `GET /generation/credit-cost/:type`
- Purchase more credits or contact admin

### Credits Deducted but Generation Failed
- Credits stored in generation metadata
- Admin can refund via dashboard
- Automatic refund for system errors (future feature)

### Unexpected Credit Cost
- Verify feature type and options
- Check duration/count multipliers
- Review credit-costs.config.ts for current rates

## Support

For credit-related issues:
1. Check this documentation
2. View admin dashboard for credit history
3. Contact support with generation ID
4. Request refund if generation failed

---

**Last Updated**: December 2024
**Version**: 1.0
