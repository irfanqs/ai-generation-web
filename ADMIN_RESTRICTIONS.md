# Admin Account Restrictions

## Overview
Admin accounts are designed **exclusively for monitoring and management purposes**. They cannot use AI generation features to maintain clear separation between administrative and user functions.

---

## 🚫 What Admin CANNOT Do

### 1. Access User Dashboard
- Admin cannot access `/dashboard` routes
- Automatic redirect to `/admin/dashboard` if attempted
- Dashboard layout blocks admin users

### 2. Use AI Generation Features
- ❌ Text to Image
- ❌ Image to Image
- ❌ Image to Video
- ❌ Text to Video
- ❌ Text to Speech
- ❌ Character Creation
- ❌ Food Photography
- ❌ Product with Model
- ❌ Video Scene Creator

### 3. Access Generation Endpoints
All generation endpoints protected with `NonAdminGuard`:
```
POST /generation/text-to-image       → 403 Forbidden
POST /generation/image-to-image      → 403 Forbidden
POST /generation/image-to-video      → 403 Forbidden
POST /generation/text-to-speech      → 403 Forbidden
GET  /generation/history             → 403 Forbidden
GET  /generation/:id                 → 403 Forbidden
```

**Error Response**:
```json
{
  "statusCode": 403,
  "message": "Admin accounts cannot use generation features. Please use a regular user account."
}
```

---

## ✅ What Admin CAN Do

### 1. Access Admin Dashboard
- URL: `/admin/dashboard`
- View statistics and metrics
- Monitor platform usage

### 2. View All Users
- List all registered users
- Search by email or name
- Pagination support
- View user details:
  - Email, name, credits
  - Join date
  - Total generations count

### 3. Manage User Credits
- Edit credits for any user
- Add or reduce credits
- Inline editing in user table

### 4. View Dashboard Statistics
- Total users count
- Total generations count
- Active users (last 7 days)
- Recent generations list

### 5. Access Credit Information
Admin can view credit costs (read-only):
```
GET /generation/credit-costs         → ✅ Allowed
GET /generation/credit-cost/:type    → ✅ Allowed
```

---

## 🔒 Security Implementation

### Frontend Protection

#### 1. Navbar
```typescript
// Shows different menu for admin
{user.isAdmin ? (
  <Link href="/admin/dashboard">Admin Dashboard</Link>
) : (
  <Link href="/dashboard">Dashboard</Link>
)}
```

#### 2. Hero Component
```typescript
// Redirects admin to admin dashboard
if (user.isAdmin) {
  router.push('/admin/dashboard');
} else {
  router.push('/dashboard');
}
```

#### 3. Dashboard Layout
```typescript
// Blocks admin from user dashboard
if (_hasHydrated && user?.isAdmin) {
  router.push('/admin/dashboard');
}
```

#### 4. Login Page
```typescript
// Redirects based on role
if (data.user.isAdmin) {
  router.push('/admin/dashboard');
} else {
  router.push('/dashboard');
}
```

### Backend Protection

#### 1. NonAdminGuard
```typescript
@Injectable()
export class NonAdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const userId = request.user?.userId;
    
    // Query database to check admin status
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    if (user?.isAdmin) {
      throw new ForbiddenException(
        'Admin accounts cannot use generation features. Please use a regular user account.'
      );
    }

    return true;
  }
}
```

#### 2. Controller Protection
```typescript
@Controller('generation')
@UseGuards(JwtAuthGuard)
export class GenerationController {
  
  @Post('text-to-image')
  @UseGuards(NonAdminGuard)  // ← Blocks admin
  async textToImage() { ... }
  
  @Post('image-to-video')
  @UseGuards(NonAdminGuard)  // ← Blocks admin
  async imageToVideo() { ... }
  
  // ... all generation endpoints protected
}
```

---

## 🎯 Use Cases

### Scenario 1: Admin Tries to Generate
**Action**: Admin navigates to `/dashboard/text-to-image`

**Result**:
1. Dashboard layout detects `user.isAdmin = true`
2. Automatic redirect to `/admin/dashboard`
3. Info message displayed: "Admin Account - Monitoring Only"

### Scenario 2: Admin Calls API Directly
**Action**: Admin sends POST request to `/generation/text-to-image`

**Result**:
1. JwtAuthGuard validates token ✅
2. NonAdminGuard checks `isAdmin` field
3. Returns 403 Forbidden with message
4. No credits deducted
5. No generation created

### Scenario 3: Admin Needs to Test Features
**Solution**: Create a separate regular user account

```bash
# Register as regular user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'

# Login and use generation features
# Admin can add credits to this test account via admin dashboard
```

---

## 📋 Admin Workflow

### Daily Tasks
1. **Login** to admin dashboard
2. **Monitor** user activity and statistics
3. **Manage** user credits as needed
4. **Review** recent generations
5. **Respond** to user issues

### Credit Management
1. Search for user by email
2. Click "Edit" button
3. Enter new credit amount
4. Click "Save"
5. Credits updated immediately

### User Support
1. User reports issue with credits
2. Admin searches user in dashboard
3. Views user's generation history
4. Adds credits if needed
5. Notifies user

---

## 🔧 Technical Details

### Database Schema
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String?
  credits   Int      @default(100)
  isAdmin   Boolean  @default(false)  // ← Key field
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  generations Generation[]
}
```

### Auth Store
```typescript
interface User {
  id: string
  email: string
  name?: string
  credits: number
  isAdmin?: boolean  // ← Included in auth state
}
```

### Guard Hierarchy
```
Request
  ↓
JwtAuthGuard (validates token)
  ↓
NonAdminGuard (checks isAdmin)
  ↓
Controller Method
```

---

## 🧪 Testing

### Test Admin Blocking

#### 1. Create Admin User
```bash
cd backend
node create-admin.js admin@test.com password123 "Test Admin"
```

#### 2. Login as Admin
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'
```

Response includes `isAdmin: true`:
```json
{
  "user": {
    "id": "...",
    "email": "admin@test.com",
    "isAdmin": true
  },
  "token": "..."
}
```

#### 3. Try Generation Endpoint
```bash
curl -X POST http://localhost:3001/generation/text-to-image \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test"}'
```

Expected Response:
```json
{
  "statusCode": 403,
  "message": "Admin accounts cannot use generation features. Please use a regular user account."
}
```

#### 4. Test Admin Endpoints
```bash
# Should work
curl http://localhost:3001/admin/stats \
  -H "Authorization: Bearer <admin-token>"

# Should work
curl http://localhost:3001/admin/users \
  -H "Authorization: Bearer <admin-token>"
```

---

## 💡 Best Practices

### For Platform Operators

1. **Separate Accounts**
   - Use admin account for management only
   - Create regular user account for testing features
   - Never mix admin and user functions

2. **Clear Communication**
   - Display "Admin Account - Monitoring Only" message
   - Show clear error messages when admin tries to generate
   - Provide instructions for creating test accounts

3. **Security**
   - Always query database for admin status (no client-side trust)
   - Use guards on all generation endpoints
   - Log admin actions for audit trail

4. **Testing**
   - Test admin blocking regularly
   - Verify all generation endpoints protected
   - Check frontend redirects work correctly

### For Admins

1. **Account Management**
   - Keep admin credentials secure
   - Don't share admin account
   - Use strong passwords

2. **Testing Features**
   - Create separate test user accounts
   - Add credits to test accounts via admin dashboard
   - Test as regular user, not admin

3. **User Support**
   - Monitor user activity
   - Respond to credit issues promptly
   - Add credits when appropriate

---

## 🚨 Troubleshooting

### Admin Can Access User Dashboard
**Problem**: Admin sees user dashboard

**Solution**:
1. Check `user.isAdmin` in auth store
2. Verify dashboard layout has admin check
3. Clear browser cache and localStorage
4. Re-login

### Admin Can Generate Content
**Problem**: Admin successfully generates content

**Solution**:
1. Check NonAdminGuard is applied to endpoint
2. Verify guard queries database (not token)
3. Check user's `isAdmin` field in database
4. Review backend logs

### Admin Endpoints Not Working
**Problem**: Admin gets 403 on admin endpoints

**Solution**:
1. Verify `isAdmin: true` in database
2. Check AdminGuard is working
3. Verify token is valid
4. Check admin module is imported

---

## 📚 Related Documentation

- `ADMIN_SETUP.md` - Admin setup guide
- `ADMIN_QUICK_START.md` - Quick start for admins
- `CREDIT_SYSTEM.md` - Credit system documentation
- `UPDATES_SUMMARY.md` - Complete updates summary

---

**Key Principle**: 
> "Admin accounts are for monitoring and management only. To use generation features, create a regular user account."

**Last Updated**: December 30, 2024
**Status**: ✅ Implemented and Tested
