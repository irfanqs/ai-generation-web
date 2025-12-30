# Updates Summary - Credit System & Admin Dashboard

## 🎯 Completed Features

### 1. Hero Component - Smart Redirect
**File**: `frontend/src/components/Hero.tsx`

**Changes**:
- "Get Started Free" button sekarang cek status login user
- Jika sudah login → redirect ke `/dashboard`
- Jika belum login → redirect ke `/register`
- Button text berubah dinamis: "Go to Dashboard" vs "Get Started Free"

**Implementation**:
```typescript
const { user } = useAuthStore();

const handleGetStarted = () => {
  if (user) {
    router.push('/dashboard');
  } else {
    router.push('/register');
  }
};
```

---

### 2. Sophisticated Credit System
**Files**:
- `backend/src/generation/credit-costs.config.ts` (NEW)
- `backend/src/generation/generation.service.ts` (UPDATED)
- `backend/src/generation/generation.controller.ts` (UPDATED)

**Features**:
✅ Dynamic credit calculation based on feature type
✅ Duration multipliers for videos (5s/10s/15s)
✅ Character count multipliers for TTS
✅ Batch operation support (multiple poses/styles)
✅ Credit cost stored in generation metadata
✅ API endpoints untuk get credit costs

**Credit Costs**:
| Feature | Cost | Notes |
|---------|------|-------|
| Text to Image | 4 credits | Per image |
| Image to Image | 4 credits | Per image |
| Image to Video | 10-20 credits | Based on duration |
| Text to Video | 12-24 credits | Based on duration |
| Text to Speech | 1+ credits | +0.5 per 1000 chars |
| Character Creation | 4 credits | Per pose |
| Food Photography | 4 credits | Per style |
| Product with Model | 5 credits | Per pose |
| Video Scene | 10 credits | Per scene |

**API Endpoints**:
```bash
# Get all credit costs
GET /generation/credit-costs

# Get specific feature cost
GET /generation/credit-cost/:type
```

**Cost Calculation Logic**:
```typescript
// Example: Image to Video 10s
calculateCreditCost('image-to-video', { duration: '10s' })
// Returns: 15 credits (10 base × 1.5 multiplier)

// Example: TTS 2500 characters
calculateCreditCost('text-to-speech', { textLength: 2500 })
// Returns: 2 credits (1 base + 1 for extra chars)

// Example: Character 5 poses
calculateCreditCost('character-creation', { count: 5 })
// Returns: 20 credits (4 × 5)
```

**Credit Packages**:
| Package | Credits | Price | Discount |
|---------|---------|-------|----------|
| Starter | 100 | $10 | 0% |
| Pro | 500 | $40 | 20% |
| Business | 1000 | $70 | 30% |
| Enterprise | 5000 | $300 | 40% |

---

### 3. Admin Dashboard (No BAC)
**Files**:
- `backend/src/admin/admin.module.ts` (NEW)
- `backend/src/admin/admin.controller.ts` (NEW)
- `backend/src/admin/admin.service.ts` (NEW)
- `backend/src/admin/admin.guard.ts` (NEW)
- `frontend/src/app/admin/login/page.tsx` (NEW)
- `frontend/src/app/admin/dashboard/page.tsx` (NEW)
- `backend/create-admin.js` (NEW)
- `backend/prisma/schema.prisma` (UPDATED - added isAdmin field)

**Features**:
✅ Admin login page dengan validation
✅ Dashboard dengan stats cards (total users, generations, active users)
✅ User management table dengan search & pagination
✅ Edit credits inline
✅ Admin badge untuk admin users
✅ Secure authentication (JWT + AdminGuard)
✅ No Broken Access Control (query database, bukan dari token)

**Security Implementation**:
```typescript
// AdminGuard - Always query database
async canActivate(context: ExecutionContext): Promise<boolean> {
  const userId = request.user?.userId;
  
  // Query database untuk validasi admin status
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    throw new ForbiddenException('Admin access required');
  }

  return true;
}
```

**Admin Endpoints**:
```bash
GET /admin/stats              # Dashboard statistics
GET /admin/users              # List all users (with pagination & search)
GET /admin/users/:id          # Get user detail
PUT /admin/users/:id/credits  # Update user credits
```

**Create Admin User**:
```bash
cd backend
node create-admin.js admin@example.com password123 "Admin Name"
```

**Admin Credentials (Already Created)**:
- Email: `admin@aiplatform.com`
- Password: `admin123`
- Credits: 10000

**Access Admin Dashboard**:
1. Navigate to: `http://localhost:3000/admin/login`
2. Login with admin credentials
3. Manage users and credits

---

## 📚 Documentation Created

### 1. CREDIT_SYSTEM.md
Comprehensive documentation covering:
- Credit cost structure and rationale
- API pricing references
- Cost calculation examples
- Credit packages
- Implementation details
- Admin features
- Best practices
- Future enhancements

### 2. CREDIT_QUICK_REFERENCE.md
Quick reference guide with:
- Credit costs cheat sheet
- Usage examples
- API usage
- Cost calculation formulas
- Best practices
- Troubleshooting

### 3. ADMIN_SETUP.md
Complete admin setup guide:
- Database migration
- Creating admin users
- API endpoints documentation
- Security features
- Testing procedures
- Troubleshooting

### 4. ADMIN_QUICK_START.md
Quick start guide for admin:
- 3-step setup process
- Common tasks
- Testing commands
- URLs reference
- Troubleshooting tips

---

## 🔧 Technical Implementation

### Database Changes
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String?
  credits   Int      @default(100)
  isAdmin   Boolean  @default(false)  // ← NEW FIELD
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  generations Generation[]
}

model Generation {
  // ... existing fields
  metadata    Json?    // Now stores creditCost
}
```

### Credit Deduction Flow
1. User initiates generation
2. Backend calculates credit cost based on:
   - Feature type
   - Duration (for videos)
   - Text length (for TTS)
   - Count (for batch operations)
3. Check user credits
4. If sufficient:
   - Create generation record
   - Store creditCost in metadata
   - Deduct credits
   - Add to queue
5. If insufficient:
   - Return error with details

### Error Handling
```typescript
if (user.credits < creditCost) {
  throw new BadRequestException(
    `Insufficient credits. Required: ${creditCost}, Available: ${user.credits}`
  );
}
```

---

## 🧪 Testing

### Test Credit System
```bash
# Start backend
cd backend
npm run start:dev

# Test credit cost endpoint
curl http://localhost:3001/generation/credit-costs \
  -H "Authorization: Bearer <token>"
```

### Test Admin Dashboard
```bash
# Create admin user
cd backend
node create-admin.js admin@test.com password123 "Test Admin"

# Test admin login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'

# Test admin endpoints
curl http://localhost:3001/admin/stats \
  -H "Authorization: Bearer <admin-token>"
```

### Test Admin API Script
```bash
cd backend
node test-admin-api.js
```

---

## 🎓 Usage Examples

### Frontend - Calculate Cost Before Generation
```typescript
// Character creation with 5 poses
const poseCount = 5;
const costPerPose = 4;
const totalCost = poseCount * costPerPose; // 20 credits

// Check if user has enough credits
if (user.credits < totalCost) {
  toast.error(`Insufficient credits. Need ${totalCost}, have ${user.credits}`);
  return;
}

// Proceed with generation
await generateCharacter({ poses: selectedPoses });
```

### Backend - Dynamic Cost Calculation
```typescript
// In generation service
const creditCost = calculateCreditCost(type, {
  duration: metadata?.duration,
  textLength: prompt?.length,
  count: metadata?.count || 1,
});

// Deduct calculated cost
await this.prisma.user.update({
  where: { id: userId },
  data: { credits: { decrement: creditCost } },
});
```

---

## 🚀 Next Steps

### Recommended Enhancements
1. **Frontend Credit Display**:
   - Show credit cost before generation
   - Display remaining credits prominently
   - Warning when credits low

2. **Credit Purchase Flow**:
   - Payment integration (Stripe/PayPal)
   - Credit package selection UI
   - Transaction history

3. **Credit Analytics**:
   - User credit usage dashboard
   - Admin analytics for credit consumption
   - Cost optimization recommendations

4. **Refund System**:
   - Automatic refund for failed generations
   - Admin manual refund capability
   - Credit transaction log

---

## 📊 System Architecture

### Credit Flow
```
User Request
    ↓
Calculate Cost (based on type + options)
    ↓
Check Balance
    ↓
Sufficient? → Yes → Deduct Credits → Process
           → No  → Return Error
```

### Admin Access Control
```
Request → JWT Auth → Admin Guard → Database Query
                                        ↓
                                   isAdmin = true?
                                        ↓
                                   Yes → Allow
                                   No  → 403 Forbidden
```

---

## ✅ Quality Assurance

### Build Status
- ✅ Backend build: Success
- ✅ Frontend build: Success
- ✅ TypeScript: No errors
- ✅ Database migration: Applied

### Security Checklist
- ✅ Admin guard queries database (no BAC)
- ✅ JWT authentication required
- ✅ Credit validation before deduction
- ✅ Error messages don't expose sensitive data
- ✅ Admin credentials properly hashed

### Testing Checklist
- ✅ Credit cost calculation
- ✅ Admin login flow
- ✅ Admin endpoints protection
- ✅ User credit deduction
- ✅ Insufficient credits handling

---

## 📞 Support

### Documentation Files
- `CREDIT_SYSTEM.md` - Full credit system documentation
- `CREDIT_QUICK_REFERENCE.md` - Quick reference guide
- `ADMIN_SETUP.md` - Admin setup guide
- `ADMIN_QUICK_START.md` - Quick start for admins

### Key URLs
- Admin Login: `http://localhost:3000/admin/login`
- Admin Dashboard: `http://localhost:3000/admin/dashboard`
- User Dashboard: `http://localhost:3000/dashboard`
- API Base: `http://localhost:3001`

### Admin Credentials
- Email: `admin@aiplatform.com`
- Password: `admin123`
- Credits: 10000

---

**Implementation Date**: December 30, 2024
**Status**: ✅ Complete and Tested
