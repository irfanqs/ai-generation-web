# Credit System - Quick Reference

## 💰 Credit Costs Cheat Sheet

| Feature | Base Cost | Notes |
|---------|-----------|-------|
| **Text to Image** | 4 credits | Per image |
| **Image to Image** | 4 credits | Per image |
| **Image to Video** | 10-20 credits | 5s=10, 10s=15, 15s=20 |
| **Text to Video** | 12-24 credits | 5s=12, 10s=18, 15s=24 |
| **Text to Speech** | 1+ credits | +0.5 per 1000 chars |
| **Character Creation** | 4 credits | Per pose |
| **Food Photography** | 4 credits | Per style |
| **Product with Model** | 5 credits | Per pose |
| **Video Scene** | 10 credits | Per scene |

## 📦 Credit Packages

| Package | Credits | Price | Discount |
|---------|---------|-------|----------|
| Starter | 100 | $10 | 0% |
| Pro | 500 | $40 | 20% |
| Business | 1000 | $70 | 30% |
| Enterprise | 5000 | $300 | 40% |

## 🎯 Usage Examples

### With 100 Credits You Can Generate:
- ✅ 25 images (text-to-image)
- ✅ 10 videos 5s (image-to-video)
- ✅ 100 short TTS audio
- ✅ 5 character sets (5 poses each)
- ✅ 20 food photos (20 styles)
- ✅ 10 product photos (10 poses)

### Popular Combinations:
- **Content Creator Pack**: 10 images + 5 videos 5s = 90 credits
- **Character Designer Pack**: 2 characters × 5 poses = 40 credits
- **Food Blogger Pack**: 15 food photos (15 styles) = 60 credits
- **Video Storyteller Pack**: 4 scenes × 10s video = 72 credits

## 🔧 API Usage

### Get Credit Costs
```bash
# All costs
curl http://localhost:3001/generation/credit-costs \
  -H "Authorization: Bearer <token>"

# Specific feature
curl http://localhost:3001/generation/credit-cost/text-to-image \
  -H "Authorization: Bearer <token>"
```

### Check User Credits
```bash
curl http://localhost:3001/auth/me \
  -H "Authorization: Bearer <token>"
```

## 💡 Cost Calculation Examples

### Text to Speech
```
Text length: 2500 characters
Base: 1 credit
Extra: ceil(2500/1000) × 0.5 = 2 × 0.5 = 1 credit
Total: 2 credits
```

### Image to Video (10 seconds)
```
Base: 10 credits
Multiplier: 1.5x (for 10s)
Total: 10 × 1.5 = 15 credits
```

### Character Creation (5 poses)
```
Per pose: 4 credits
Count: 5 poses
Total: 4 × 5 = 20 credits
```

### Food Ultimate Pack (20 styles)
```
Per style: 4 credits
Count: 20 styles
Total: 4 × 20 = 80 credits
```

## 🎓 Best Practices

### Save Credits
1. ✅ Test with shorter video durations first
2. ✅ Select only needed poses/styles
3. ✅ Refine prompts before final generation
4. ✅ Buy larger packages for better rates

### Avoid Waste
1. ❌ Don't generate all poses if you only need a few
2. ❌ Don't use 15s videos if 5s is enough
3. ❌ Don't generate multiple variations without reviewing first
4. ❌ Don't forget to check credit balance before batch operations

## 🔐 Admin Operations

### Add Credits to User
```bash
curl -X PUT http://localhost:3001/admin/users/<user-id>/credits \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"credits": 500}'
```

### View User Credit Usage
1. Login to admin dashboard: `/admin/login`
2. Search for user
3. View generations count and credit history

## 📊 Credit Analytics

### Total Credits Consumed
```sql
SELECT SUM((metadata->>'creditCost')::int) as total
FROM generations
WHERE status = 'completed';
```

### Credits by Feature
```sql
SELECT type, SUM((metadata->>'creditCost')::int) as credits
FROM generations
WHERE status = 'completed'
GROUP BY type
ORDER BY credits DESC;
```

## 🆘 Troubleshooting

### Error: "Insufficient credits"
```
Required: 20 credits
Available: 15 credits
```
**Solution**: Purchase more credits or reduce batch size

### Credits Deducted but Failed
**Solution**: Contact admin with generation ID for refund

### Unexpected Cost
**Solution**: Check feature type and multipliers in CREDIT_SYSTEM.md

## 🚀 Quick Start

### 1. Check Your Credits
```typescript
const user = useAuthStore().user;
console.log('Credits:', user.credits);
```

### 2. Calculate Cost Before Generation
```typescript
// Frontend estimation
const poseCount = 5;
const costPerPose = 4;
const totalCost = poseCount * costPerPose;

if (user.credits < totalCost) {
  alert('Insufficient credits!');
}
```

### 3. Display Cost to User
```tsx
<div className="text-sm text-gray-600">
  This will cost {totalCost} credits
</div>
```

### 4. Handle Insufficient Credits
```typescript
try {
  await generateContent();
} catch (error) {
  if (error.response?.data?.message?.includes('Insufficient')) {
    // Show purchase credits modal
  }
}
```

## 📱 Frontend Integration

### Show Credit Balance
```tsx
<div className="flex items-center gap-2">
  <Coins className="w-5 h-5" />
  <span>{user.credits} credits</span>
</div>
```

### Show Cost Per Feature
```tsx
<div className="bg-blue-50 p-4 rounded-lg">
  <p className="text-sm text-blue-900">
    💰 Cost: {creditCost} credits per {unit}
  </p>
</div>
```

### Calculate Dynamic Cost
```tsx
const [selectedPoses, setSelectedPoses] = useState([]);
const creditCost = selectedPoses.length * 4;

<p>Total: {creditCost} credits</p>
```

---

**Need Help?**
- Full documentation: `CREDIT_SYSTEM.md`
- Admin guide: `ADMIN_SETUP.md`
- API reference: Backend `/generation/credit-costs`
