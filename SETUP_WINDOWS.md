# Setup Guide - Windows

## Prerequisites

### 1. Install Node.js
Download dan install dari: https://nodejs.org/ (versi LTS)

### 2. Setup Supabase (Database)

1. Buka https://supabase.com/ dan buat akun
2. Klik "New Project"
3. Isi nama project dan password database
4. Pilih region terdekat (Singapore recommended)
5. Tunggu project selesai dibuat
6. Pergi ke **Settings → Database**
7. Scroll ke bagian **Connection string**
8. Copy kedua URL:
   - **Transaction pooler** (port 6543) → untuk `DATABASE_URL`
   - **Session pooler** (port 5432) → untuk `DIRECT_URL`

### 3. Install Redis (pilih salah satu)

**Opsi A: Menggunakan Memurai (Recommended untuk Windows)**
- Download dari: https://www.memurai.com/
- Install dan jalankan sebagai service

**Opsi B: Menggunakan Docker**
```powershell
docker run -d -p 6379:6379 redis
```

### 4. Dapatkan API Keys

**Gemini API Key:**
1. Buka https://aistudio.google.com/apikey
2. Klik "Create API Key"
3. Copy API key

**Cloudinary (untuk upload media):**
1. Daftar di https://cloudinary.com/
2. Dashboard → Settings → Access Keys
3. Copy: Cloud Name, API Key, API Secret

---

## Setup Project

### 1. Clone/Extract Project
```powershell
cd C:\Projects
# Extract atau clone project ke folder ini
```

### 2. Setup Backend

```powershell
cd backend

# Install dependencies
npm install

# Copy environment file
copy .env.example .env
```

Edit file `backend/.env`:
```env
# Supabase Database (dapat dari Settings → Database → Connection string)
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres

REDIS_HOST=localhost
REDIS_PORT=6379
GEMINI_API_KEY=your_gemini_api_key_here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
JWT_SECRET=random_secret_string_minimal_32_karakter
PORT=3001
NODE_ENV=development
```

```powershell
# Generate Prisma client
npx prisma generate

# Push schema ke database
npx prisma db push

# Jalankan backend
npm run start:dev
```

### 4. Setup Frontend (Terminal baru)

```powershell
cd frontend

# Install dependencies
npm install

# Jalankan frontend
npm run dev
```

### 5. Buat Admin User

```powershell
cd backend
node create-admin.js
```

---

## Akses Aplikasi

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **Admin Login:** http://localhost:3000/admin/login
  - Email: admin@example.com
  - Password: admin123

---

## Troubleshooting

### Error: ECONNREFUSED Redis
Pastikan Redis/Memurai sudah running:
```powershell
# Cek service Memurai
Get-Service memurai
```

### Error: Database connection failed (Supabase)
1. Pastikan connection string sudah benar
2. Cek password database di Supabase dashboard
3. Pastikan project Supabase sudah aktif (tidak paused)
4. Coba reset database password di Settings → Database

### Error: Prisma client not generated
```powershell
cd backend
npx prisma generate
```

### Port sudah digunakan
```powershell
# Cek port 3000
netstat -ano | findstr :3000

# Kill process (ganti PID)
taskkill /PID 12345 /F
```

---

## Menjalankan Ulang (Setelah Restart PC)

1. Pastikan Redis/Memurai running
2. Terminal 1: `cd backend && npm run start:dev`
3. Terminal 2: `cd frontend && npm run dev`

(Database Supabase selalu online, tidak perlu dijalankan manual)
