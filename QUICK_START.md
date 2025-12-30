# 🚀 Quick Start Guide

## Menjalankan Aplikasi

### 1. Start Backend
```bash
cd backend
npm run start:dev
```
Backend akan berjalan di `http://localhost:3001`

### 2. Start Frontend
```bash
cd frontend
npm run dev
```
Frontend akan berjalan di `http://localhost:3000`

### 3. Pastikan Services Running
- ✅ PostgreSQL (port 5432)
- ✅ Redis (port 6379)
- ✅ Backend (port 3001)
- ✅ Frontend (port 3000)

---

## Testing Features

### Test Text-to-Image
```bash
cd backend
node test-image-generation.js
```

### Test Text-to-Video
```bash
cd backend
node test-video-generation.js
```

### Test Text-to-Speech
```bash
cd backend
node test-tts-with-wav.js
```

---

## Using the App

### 1. Register Account
- Buka `http://localhost:3000/register`
- Masukkan email, password, dan nama
- Klik "Register"
- Otomatis dapat 100 credits gratis

### 2. Login
- Buka `http://localhost:3000/login`
- Masukkan email dan password
- Klik "Login"

### 3. Generate Content
- Pilih tab fitur (Text to Image, Image to Image, dll)
- Masukkan prompt atau upload file
- Klik "Generate"
- Tunggu proses selesai
- Lihat hasil di "Recent Generations"
- Klik "View Result" untuk download

---

## API Endpoints

### Authentication
```bash
# Register
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Generation
```bash
# Text to Image
curl -X POST http://localhost:3001/generation/text-to-image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"A cute cat sitting on a chair"}'

# Text to Speech
curl -X POST http://localhost:3001/generation/text-to-speech \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Hello! Welcome to our AI platform."}'
```

---

## Troubleshooting

### Backend tidak start
```bash
# Check PostgreSQL
psql -U postgres -c "SELECT 1"

# Check Redis
redis-cli ping

# Check environment variables
cat backend/.env
```

### Frontend tidak connect ke backend
```bash
# Check frontend .env.local
cat frontend/.env.local

# Should be:
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Generation gagal
```bash
# Check backend logs
# Look for errors in terminal

# Check Gemini API key
echo $GEMINI_API_KEY

# Check credits
# Login to app and check navbar
```

---

## File Structure

```
project/
├── backend/
│   ├── src/              # Source code
│   ├── prisma/           # Database
│   ├── test-*.js         # Test scripts
│   └── .env              # Environment variables
├── frontend/
│   ├── src/              # Source code
│   └── .env.local        # Environment variables
└── docs/
    ├── README.md
    ├── SETUP.md
    ├── COMPLETE_FEATURES.md
    └── PROJECT_STATUS.md
```

---

## Important Commands

### Database
```bash
# Create migration
npx prisma migrate dev --name init

# Push schema (development)
npx prisma db push

# Open Prisma Studio
npx prisma studio
```

### Backend
```bash
# Development
npm run start:dev

# Production build
npm run build
npm run start:prod

# Lint
npm run lint
```

### Frontend
```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

---

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/aiplatform
REDIS_HOST=localhost
REDIS_PORT=6379
GEMINI_API_KEY=your_gemini_api_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
JWT_SECRET=your_jwt_secret_min_32_chars
PORT=3001
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Features Overview

| Feature | Model | Time | Credits |
|---------|-------|------|---------|
| Text to Image | gemini-2.5-flash-image | 10-20s | 1 |
| Image to Image | gemini-2.5-flash-image | 15-30s | 1 |
| Text to Video | veo-3.1-generate-preview | 1-2min | 1 |
| Text to Speech | gemini-2.5-flash-preview-tts | 5-10s | 1 |

---

## Documentation

- `README.md` - Project overview
- `SETUP.md` - Detailed setup (Bahasa Indonesia)
- `COMPLETE_FEATURES.md` - Feature documentation
- `PROJECT_STATUS.md` - Project status
- `QUICK_START.md` - This guide
- `backend/DEBUGGING.md` - Troubleshooting
- `backend/TTS_IMPLEMENTATION.md` - TTS details

---

## Support

Jika ada masalah:
1. Check logs di terminal backend
2. Check environment variables
3. Check services (PostgreSQL, Redis)
4. Refer to `backend/DEBUGGING.md`

---

**Status:** ✅ All features working  
**Ready:** ✅ Production ready  
**Last Updated:** December 27, 2024
