# Setup Guide - AI Generation Platform

## Prasyarat yang Harus Diinstall

1. **Node.js** (v18 atau lebih tinggi)
2. **PostgreSQL** (v14 atau lebih tinggi)
3. **Redis** (v6 atau lebih tinggi)

## Cara Install Dependencies

### macOS (menggunakan Homebrew)
```bash
# Install PostgreSQL
brew install postgresql@14
brew services start postgresql@14

# Install Redis
brew install redis
brew services start redis

# Verifikasi instalasi
psql --version
redis-cli --version
```

### Linux (Ubuntu/Debian)
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# Install Redis
sudo apt install redis-server
sudo systemctl start redis

# Verifikasi instalasi
psql --version
redis-cli --version
```

## Setup Database

```bash
# Masuk ke PostgreSQL
psql postgres

# Buat database baru
CREATE DATABASE aiplatform;

# Buat user (opsional)
CREATE USER aiuser WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE aiplatform TO aiuser;

# Keluar
\q
```

## Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env dengan credentials Anda
# Minimal yang harus diisi:
# - DATABASE_URL
# - GEMINI_API_KEY
# - CLOUDINARY credentials
# - JWT_SECRET

# Generate Prisma Client dan migrate database
npx prisma generate
npx prisma migrate dev --name init

# Jalankan backend
npm run start:dev
```

Backend akan berjalan di `http://localhost:3001`

## Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local (biasanya sudah benar default-nya)
# NEXT_PUBLIC_API_URL=http://localhost:3001

# Jalankan frontend
npm run dev
```

Frontend akan berjalan di `http://localhost:3000`

## Mendapatkan API Keys

### 1. Gemini API Key
- Kunjungi: https://makersuite.google.com/app/apikey
- Login dengan Google Account
- Buat API key baru
- Copy dan paste ke `.env` di `GEMINI_API_KEY`

### 2. Cloudinary Account
- Kunjungi: https://cloudinary.com/users/register/free
- Daftar akun gratis (10GB storage)
- Setelah login, buka Dashboard
- Copy credentials:
  - Cloud Name
  - API Key
  - API Secret
- Paste ke `.env` di backend

## Testing Aplikasi

1. Buka browser ke `http://localhost:3000`
2. Klik "Sign Up" untuk membuat akun
3. Login dengan akun yang baru dibuat
4. Anda akan mendapat 100 credits gratis
5. Coba generate image dari dashboard

## Troubleshooting

### Redis Connection Error
```bash
# Pastikan Redis berjalan
redis-cli ping
# Harus return: PONG

# Jika tidak berjalan, start Redis
# macOS:
brew services start redis
# Linux:
sudo systemctl start redis
```

### PostgreSQL Connection Error
```bash
# Cek status PostgreSQL
# macOS:
brew services list
# Linux:
sudo systemctl status postgresql

# Cek connection string di .env
# Format: postgresql://username:password@localhost:5432/database_name
```

### Prisma Migration Error
```bash
# Reset database (HATI-HATI: menghapus semua data)
npx prisma migrate reset

# Atau buat migration baru
npx prisma migrate dev
```

## Deployment

### Backend (Railway/Render)
1. Push code ke GitHub
2. Connect repository ke Railway/Render
3. Set environment variables
4. Deploy

### Frontend (Vercel)
1. Push code ke GitHub
2. Import project di Vercel
3. Set environment variables
4. Deploy

### Database (Supabase - Gratis)
1. Buat project di https://supabase.com
2. Copy connection string
3. Update DATABASE_URL di backend

### Redis (Upstash - Gratis)
1. Buat database di https://upstash.com
2. Copy host dan port
3. Update REDIS_HOST dan REDIS_PORT

## Catatan Penting

1. **Gemini API**: Pastikan Anda menggunakan paid account untuk akses penuh ke semua fitur
2. **Rate Limiting**: Aplikasi sudah dilengkapi rate limiting (10 requests/menit per user)
3. **Queue System**: Bull Queue akan handle concurrent requests secara otomatis
4. **Credits**: Setiap generation menggunakan 1 credit
5. **Storage**: Cloudinary free tier memberikan 10GB storage (cukup untuk prototype)

## Skalabilitas untuk 500-1000 Users

Aplikasi ini sudah didesain untuk handle traffic tinggi dengan:

1. **Queue System (Bull + Redis)**: Memproses generation secara asynchronous
2. **Rate Limiting**: Mencegah abuse dan overload
3. **Database Indexing**: Query optimization untuk performa
4. **Cloudinary CDN**: Fast image/video delivery
5. **Stateless Backend**: Mudah untuk horizontal scaling

Untuk production dengan 500-1000 concurrent users:
- Backend: 2-4 instances (Railway/Render)
- Database: Supabase Pro atau dedicated PostgreSQL
- Redis: Upstash Pro atau Redis Cloud
- Frontend: Vercel (auto-scaling)

## Support

Jika ada pertanyaan atau masalah, silakan buat issue di repository.
