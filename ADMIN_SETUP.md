# Admin Dashboard Setup

## Overview
Admin dashboard untuk memantau dan mengelola kredit user tanpa menggunakan BAC (Broken Access Control). Sistem menggunakan field `isAdmin` di database dan AdminGuard untuk proteksi endpoint.

## Backend Setup

### 1. Database Migration
Field `isAdmin` sudah ditambahkan ke User model:
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String?
  credits   Int      @default(100)
  isAdmin   Boolean  @default(false)  // ← Field baru
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  generations Generation[]
}
```

### 2. Membuat Admin User Pertama

Jalankan script untuk membuat admin:

```bash
cd backend
node create-admin.js [email] [password] [name]
```

Contoh:
```bash
# Dengan kredensial default
node create-admin.js

# Dengan kredensial custom
node create-admin.js admin@myapp.com mySecurePass123 "Super Admin"
```

Output:
```
✅ Admin berhasil dibuat!
📧 Email: admin@myapp.com
🔑 Password: mySecurePass123
👤 Name: Super Admin
💰 Credits: 10000
```

### 3. Admin API Endpoints

Semua endpoint dilindungi dengan `JwtAuthGuard` dan `AdminGuard`:

#### Get Dashboard Stats
```
GET /admin/stats
Authorization: Bearer <token>

Response:
{
  "totalUsers": 150,
  "totalGenerations": 3420,
  "activeUsers": 45,
  "recentGenerations": [...]
}
```

#### Get All Users (dengan pagination & search)
```
GET /admin/users?page=1&limit=20&search=john
Authorization: Bearer <token>

Response:
{
  "users": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

#### Get User Detail
```
GET /admin/users/:id
Authorization: Bearer <token>
```

#### Update User Credits
```
PUT /admin/users/:id/credits
Authorization: Bearer <token>
Content-Type: application/json

{
  "credits": 500
}
```

## Frontend Setup

### 1. Admin Login
URL: `/admin/login`

- Login menggunakan email dan password
- Validasi `isAdmin` di client-side
- Token disimpan di localStorage dengan key `admin-token`
- Redirect ke `/admin/dashboard` jika berhasil

### 2. Admin Dashboard
URL: `/admin/dashboard`

Fitur:
- **Stats Cards**: Total users, total generations, active users (7 hari terakhir)
- **User Management Table**:
  - Search by email/name
  - Pagination (10 users per page)
  - View user details (email, name, credits, generations count, join date)
  - Edit credits inline
  - Admin badge untuk user admin
- **Logout**: Clear token dan redirect ke login

### 3. Security Features

#### Backend Protection
1. **JwtAuthGuard**: Validasi JWT token
2. **AdminGuard**: Cek `isAdmin` dari database (bukan dari token!)
3. **No BAC**: Guard selalu query database untuk validasi admin status

```typescript
// AdminGuard implementation
async canActivate(context: ExecutionContext): Promise<boolean> {
  const request = context.switchToHttp().getRequest();
  const userId = request.user?.userId;

  // Query database untuk cek admin status
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

#### Frontend Protection
1. Check token existence
2. Check `isAdmin` dari stored user data
3. Auto-redirect ke login jika unauthorized (401/403)

## Testing

### 1. Test Admin Login
```bash
# Login sebagai admin
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

### 2. Test Admin Endpoints
```bash
# Get stats
curl http://localhost:3001/admin/stats \
  -H "Authorization: Bearer <admin-token>"

# Get users
curl http://localhost:3001/admin/users?page=1&limit=10 \
  -H "Authorization: Bearer <admin-token>"

# Update credits
curl -X PUT http://localhost:3001/admin/users/<user-id>/credits \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"credits":500}'
```

### 3. Test Non-Admin Access
```bash
# Login sebagai user biasa
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Try to access admin endpoint (should fail with 403)
curl http://localhost:3001/admin/stats \
  -H "Authorization: Bearer <user-token>"
```

Expected response:
```json
{
  "statusCode": 403,
  "message": "Admin access required"
}
```

## Upgrade User ke Admin

Jika ingin upgrade user existing menjadi admin:

```bash
cd backend
node create-admin.js existing@email.com
```

Script akan detect user sudah ada dan update `isAdmin` menjadi `true`.

Atau via Prisma Studio:
```bash
cd backend
npx prisma studio
```

Buka User table, edit user, set `isAdmin` = true.

## Security Best Practices

✅ **DO:**
- Selalu validasi admin status dari database
- Gunakan HTTPS di production
- Rotate admin passwords secara berkala
- Log semua admin actions
- Limit admin endpoints dengan rate limiting

❌ **DON'T:**
- Jangan simpan admin status di JWT token
- Jangan trust client-side validation saja
- Jangan expose admin endpoints tanpa guard
- Jangan hardcode admin credentials

## Troubleshooting

### "Admin access required" error
- Pastikan user memiliki `isAdmin: true` di database
- Check JWT token valid dan tidak expired
- Verify AdminGuard terpasang di controller

### "Sesi berakhir" di frontend
- Token expired atau invalid
- Clear localStorage dan login ulang
- Check backend JWT secret configuration

### Cannot create admin
- Check database connection
- Verify Prisma schema sudah sync (`npx prisma db push`)
- Check bcrypt package installed
