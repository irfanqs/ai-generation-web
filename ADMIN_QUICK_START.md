# Admin Dashboard - Quick Start Guide

## 🚀 Setup dalam 3 Langkah

### 1. Buat Admin User
```bash
cd backend
node create-admin.js admin@aiplatform.com admin123 "Super Admin"
```

Output:
```
✅ Admin berhasil dibuat!
📧 Email: admin@aiplatform.com
🔑 Password: admin123
👤 Name: Super Admin
💰 Credits: 10000
```

### 2. Start Backend & Frontend
```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 3. Login ke Admin Dashboard
1. Buka browser: `http://localhost:3000/admin/login`
2. Login dengan kredensial admin yang dibuat di step 1
3. Anda akan diarahkan ke dashboard admin

## 📊 Fitur Admin Dashboard

### Dashboard Stats
- **Total Users**: Jumlah semua user terdaftar
- **Total Generations**: Total AI generations yang dibuat
- **Active Users**: User aktif dalam 7 hari terakhir

### User Management
- **Search**: Cari user berdasarkan email atau nama
- **View Details**: Lihat info lengkap user (email, nama, credits, jumlah generations, tanggal join)
- **Edit Credits**: Klik tombol "Edit" untuk mengubah credits user
- **Pagination**: Navigate antar halaman (10 users per page)

## 🔐 Security

### Backend Protection
✅ JWT Authentication (JwtAuthGuard)
✅ Admin Authorization (AdminGuard - query database, bukan dari token)
✅ No Broken Access Control (BAC)

### Frontend Protection
✅ Token validation
✅ Admin status check
✅ Auto-redirect jika unauthorized

## 📝 Common Tasks

### Menambah Credits User
1. Login ke admin dashboard
2. Cari user yang ingin diubah
3. Klik tombol "Edit" di kolom Actions
4. Masukkan jumlah credits baru
5. Klik "Save"

### Membuat Admin Baru
```bash
cd backend
node create-admin.js newemail@example.com newpassword "New Admin"
```

### Upgrade User Existing ke Admin
```bash
cd backend
node create-admin.js existing@email.com
```
Script akan detect user sudah ada dan update menjadi admin.

### Melihat Semua Admin
```bash
cd backend
npx prisma studio
```
Buka User table, filter `isAdmin = true`

## 🧪 Testing

### Test Login Admin
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aiplatform.com","password":"admin123"}'
```

Response akan include `isAdmin: true`:
```json
{
  "user": {
    "id": "...",
    "email": "admin@aiplatform.com",
    "name": "Super Admin",
    "credits": 10000,
    "isAdmin": true
  },
  "token": "eyJhbGc..."
}
```

### Test Admin Endpoint
```bash
# Simpan token dari response login
TOKEN="eyJhbGc..."

# Get dashboard stats
curl http://localhost:3001/admin/stats \
  -H "Authorization: Bearer $TOKEN"

# Get users list
curl http://localhost:3001/admin/users \
  -H "Authorization: Bearer $TOKEN"
```

### Test Non-Admin Access (Should Fail)
```bash
# Login sebagai user biasa
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Try admin endpoint dengan user token
curl http://localhost:3001/admin/stats \
  -H "Authorization: Bearer <user-token>"
```

Expected: `403 Forbidden - Admin access required`

## 🎯 URLs

- **Admin Login**: http://localhost:3000/admin/login
- **Admin Dashboard**: http://localhost:3000/admin/dashboard
- **User Dashboard**: http://localhost:3000/dashboard
- **Backend API**: http://localhost:3001

## ⚠️ Important Notes

1. **Jangan hardcode admin credentials** di production
2. **Gunakan HTTPS** di production
3. **Rotate passwords** secara berkala
4. **Backup database** sebelum bulk update credits
5. **Monitor admin actions** dengan logging

## 🐛 Troubleshooting

### "Admin access required" error
- Pastikan user memiliki `isAdmin: true` di database
- Check dengan: `npx prisma studio` → User table

### "Sesi berakhir" di frontend
- Token expired atau invalid
- Clear localStorage: `localStorage.clear()`
- Login ulang

### Cannot login
- Check backend running: `http://localhost:3001/auth/login`
- Check database connection
- Verify admin user exists: `npx prisma studio`

### Credits tidak update
- Check network tab di browser
- Verify admin token valid
- Check backend logs untuk error

## 📚 Dokumentasi Lengkap

Lihat `ADMIN_SETUP.md` untuk dokumentasi detail tentang:
- API endpoints lengkap
- Security implementation
- Database schema
- Best practices
