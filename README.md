# AI Generation Platform

Platform untuk generate image-to-image, text-to-image, image-to-video, TTS menggunakan Gemini API.

## Tech Stack
- **Backend**: NestJS + PostgreSQL + Redis + Bull Queue
- **Frontend**: Next.js 14 + TailwindCSS
- **Storage**: Cloudinary
- **AI**: Google Gemini API

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis
- Gemini API Key (Paid)
- Cloudinary Account

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env dengan credentials Anda
npm run start:dev
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local dengan API URL
npm run dev
```

### Environment Variables

**Backend (.env)**
```
DATABASE_URL=postgresql://user:password@localhost:5432/aiplatform
REDIS_HOST=localhost
REDIS_PORT=6379
GEMINI_API_KEY=your_gemini_api_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
JWT_SECRET=your_jwt_secret
PORT=3001
```

**Frontend (.env.local)**
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Features ✅
- ✅ Hero Section
- ✅ Pricing Plans
- ✅ Text to Image Generation (gemini-2.5-flash-image)
- ✅ Image to Image Generation (gemini-2.5-flash-image)
- ✅ Text to Video Generation (veo-3.1-generate-preview)
- ✅ Text to Speech (gemini-2.5-flash-preview-tts)
- ✅ Queue System untuk handle 500-1000 concurrent users
- ✅ Rate Limiting (10 req/min per user)
- ✅ User Authentication (JWT + bcrypt)
- ✅ Credits System (100 free credits per user)
- ✅ Generation History
- ✅ Cloudinary Storage Integration

**All features are fully implemented and working!** 🎉

See [COMPLETE_FEATURES.md](COMPLETE_FEATURES.md) for detailed documentation.

## Deployment Ready
- Backend: Railway, Render, atau VPS
- Frontend: Vercel
- Database: Supabase (PostgreSQL gratis)
- Redis: Upstash (gratis tier)
- Storage: Cloudinary (10GB gratis)
