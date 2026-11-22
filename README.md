# MINDHAVEN – AI Mental Wellness for Youth

Your safe space for mental wellness. AI-powered, confidential, empathetic support for youth seeking emotional guidance.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, TailwindCSS, Framer Motion, Lucide Icons
- **Backend:** Next.js API Routes, Prisma ORM, PostgreSQL
- **Auth:** JWT
- **AI:** Open Router API

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL (or use Docker)

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

- `DATABASE_URL` – PostgreSQL connection string
- `JWT_SECRET` – Random string for JWT signing
- `GEMINI_API_KEY` or `OPENAI_API_KEY` – For AI chat (optional; app works without it with fallback responses)

### 3. Database setup

```bash
npx prisma generate
npx prisma db push
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docker

```bash
docker-compose up -d
```

This starts the app and PostgreSQL. Run migrations:

```bash
docker-compose exec app npx prisma db push
```

## Project Structure

```
mindhaven/
├── prisma/
│   └── schema.prisma      # Database models
├── src/
│   ├── app/
│   │   ├── api/           # API routes (auth, chat)
│   │   ├── auth/          # Login / Signup
│   │   ├── chat/          # AI Chat
│   │   ├── mood/          # Mood Tracker
│   │   ├── wellness/      # Wellness Tools
│   │   ├── resources/     # Resources & Helplines
│   │   └── community/     # Anonymous Community
│   ├── components/
│   │   ├── ui/            # Reusable UI components
│   │   ├── navbar.tsx
│   │   └── theme-provider.tsx
│   └── lib/
│       ├── auth.ts
│       ├── db.ts
│       └── utils.ts
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Features

- **Landing page** – Hero, features, testimonials, CTA
- **AI Chat** – Empathetic AI companion with emotion detection
- **Mood Tracker** – Log mood, view trends, weekly insights
- **Wellness Tools** – Guided breathing, meditation timer, stress tips
- **Resources** – Articles, guides, crisis helplines (India)
- **Community** – Anonymous posting with AI moderation
- **Auth** – JWT login/signup, optional anonymous mode
- **Theme** – Dark/Light mode toggle

## Deployment (Vercel)

1. Push to GitHub
2. Import in Vercel
3. Add env vars: `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY` or `OPENAI_API_KEY`
4. Add a PostgreSQL add-on (e.g. Vercel Postgres, Neon, Supabase)

## License

MIT

