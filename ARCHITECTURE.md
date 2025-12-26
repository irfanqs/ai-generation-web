# Arsitektur Aplikasi

## Overview

Aplikasi ini menggunakan arsitektur modern dengan pemisahan backend dan frontend yang jelas, dilengkapi dengan queue system untuk handle concurrent requests.

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Next.js   │────────▶│   NestJS     │────────▶│   Gemini    │
│  Frontend   │         │   Backend    │         │     API     │
└─────────────┘         └──────────────┘         └─────────────┘
                               │
                               ├──────────▶ PostgreSQL (Data)
                               │
                               ├──────────▶ Redis (Queue)
                               │
                               └──────────▶ Cloudinary (Storage)
```

## Backend Architecture (NestJS)

### Modules

1. **Auth Module**
   - User registration & login
   - JWT authentication
   - Password hashing dengan bcrypt

2. **Generation Module**
   - Handle semua tipe generation (text-to-image, image-to-image, dll)
   - Queue management dengan Bull
   - Integration dengan Gemini API
   - Upload ke Cloudinary

3. **Prisma Module**
   - Database ORM
   - Type-safe queries
   - Migration management

### Services

1. **GeminiService**
   - Wrapper untuk Google Generative AI
   - Handle text-to-image (Imagen)
   - Handle image-to-image
   - Handle image-to-video (Veo)
   - Handle text-to-speech

2. **CloudinaryService**
   - Upload files (images, videos, audio)
   - Support base64 dan buffer upload
   - CDN delivery

3. **GenerationService**
   - Create generation requests
   - Check user credits
   - Queue management
   - History tracking

### Queue System (Bull + Redis)

```
User Request → API → Create Job → Redis Queue → Worker Process → Gemini API → Cloudinary → Update DB
```

**Keuntungan:**
- Non-blocking: User tidak perlu menunggu generation selesai
- Scalable: Bisa add multiple workers
- Reliable: Job retry jika gagal
- Monitoring: Track job status

### Database Schema

```prisma
User {
  id, email, password, credits
  generations[]
}

Generation {
  id, userId, type, prompt, inputUrl, outputUrl, status
  user
}
```

## Frontend Architecture (Next.js 14)

### Pages

1. **Home (/)** - Hero + Features + Pricing
2. **/login** - User login
3. **/register** - User registration
4. **/dashboard** - Main app interface

### State Management (Zustand)

```typescript
AuthStore {
  user, token
  setAuth(), logout(), updateCredits()
}
```

**Keuntungan Zustand:**
- Lightweight (< 1KB)
- Simple API
- Persist support (localStorage)
- No boilerplate

### API Client (Axios)

- Centralized configuration
- Auto token injection
- Error handling

## Security Features

1. **Authentication**
   - JWT tokens (7 days expiry)
   - Password hashing (bcrypt)
   - Protected routes

2. **Rate Limiting**
   - 10 requests per minute per user
   - Prevent API abuse

3. **Input Validation**
   - class-validator di backend
   - Form validation di frontend

4. **CORS**
   - Configured untuk frontend domain
   - Credentials support

## Scalability Strategy

### Untuk 500-1000 Concurrent Users

1. **Horizontal Scaling**
   ```
   Load Balancer
        │
        ├──▶ Backend Instance 1
        ├──▶ Backend Instance 2
        ├──▶ Backend Instance 3
        └──▶ Backend Instance 4
   ```

2. **Database Optimization**
   - Connection pooling
   - Indexes pada userId dan status
   - Read replicas untuk query heavy operations

3. **Redis Cluster**
   - Multiple Redis instances
   - Queue distribution
   - Session storage

4. **CDN (Cloudinary)**
   - Global content delivery
   - Automatic optimization
   - Caching

5. **Caching Strategy**
   - Redis cache untuk frequent queries
   - Browser caching untuk static assets
   - API response caching

## Performance Optimizations

1. **Backend**
   - Async/await untuk non-blocking operations
   - Queue system untuk heavy tasks
   - Database query optimization
   - Connection pooling

2. **Frontend**
   - Next.js automatic code splitting
   - Image optimization
   - Lazy loading
   - Client-side caching

3. **API**
   - Pagination untuk list endpoints
   - Selective field loading
   - Compression (gzip)

## Monitoring & Logging

### Recommended Tools

1. **Application Monitoring**
   - Sentry (error tracking)
   - LogRocket (session replay)

2. **Performance Monitoring**
   - New Relic / DataDog
   - Uptime monitoring

3. **Queue Monitoring**
   - Bull Board (visual queue management)
   - Redis monitoring

## Cost Estimation (Monthly)

### Development/Prototype
- Cloudinary: $0 (10GB free)
- Supabase: $0 (500MB free)
- Upstash Redis: $0 (10K commands/day)
- Vercel: $0 (hobby plan)
- Railway: $5 (starter)
**Total: ~$5/month**

### Production (500-1000 users)
- Cloudinary: $0-49 (depends on usage)
- Supabase Pro: $25
- Upstash Redis: $10-20
- Vercel Pro: $20
- Railway: $20-40 (multiple instances)
- Gemini API: Variable (pay per use)
**Total: ~$100-200/month**

## Deployment Checklist

- [ ] Set semua environment variables
- [ ] Run database migrations
- [ ] Test Gemini API connection
- [ ] Test Cloudinary upload
- [ ] Test Redis connection
- [ ] Configure CORS untuk production domain
- [ ] Enable HTTPS
- [ ] Setup monitoring
- [ ] Configure backup strategy
- [ ] Load testing
- [ ] Security audit

## Future Enhancements

1. **Features**
   - Batch generation
   - Generation templates
   - User galleries
   - Social sharing
   - API access untuk enterprise

2. **Technical**
   - WebSocket untuk real-time updates
   - GraphQL API
   - Microservices architecture
   - Kubernetes deployment
   - Multi-region deployment

3. **Business**
   - Payment integration (Stripe)
   - Subscription management
   - Usage analytics
   - Admin dashboard
   - Referral system
