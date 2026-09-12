# CampusCentral — Modular Monolith Student Journey Platform

CampusCentral is an end-to-end higher-education student journey platform built with Next.js 14 (App Router), TypeScript, Tailwind CSS, Prisma ORM, SQLite (for demo evaluation; PostgreSQL-compatible architecture), and Redis.

## Tech Stack
- **Frontend**: Next.js 14 App Router, React, Tailwind CSS, Lucide React Icons
- **Backend**: Node.js, Next.js API Routes, TypeScript
- **Database**: SQLite for zero-setup demo evaluation (PostgreSQL-compatible schema with Prisma ORM; ready for production PostgreSQL deployment)
- **Caching**: Redis (60s TTL for timeline & notices, write-through invalidation)
- **Auth**: bcrypt (password verification) + jose (Edge-compatible pure-JS JWT in httpOnly cookie)
- **Validation**: Zod schema validation on all API endpoints with structured response envelope

---

## Environment Variables (`.env`)
Create a `.env` file in the root directory:

```env
# SQLite for local demo evaluation (default)
DATABASE_URL="file:./dev.db"

# Or configure PostgreSQL for production deployment:
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/campuscentral?schema=public"

REDIS_URL="redis://localhost:6379"
JWT_SECRET="campus-central-secret-key-super-secure-jwt-2026"
JWT_EXPIRES_IN="7d"
```

---

## Demo Accounts
The database seed script initializes three accounts for testing all role capabilities:

| Role | Name | Email | Password |
| :--- | :--- | :--- | :--- |
| **Student** | Vedant Bhoi | `vedant@campus.edu` | `student123` |
| **Teacher** | Yash Bhure | `yashbhure@campus.edu` | `faculty123` |
| **Admin** | Yash More | `yashmore@campus.edu` | `admin123` |

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Migration & Prisma Generation
```bash
npx prisma generate
npx prisma db push
```

### 3. Seed Demo Data
```bash
npx prisma db seed
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
