<div align="center">

# 🥗 NutriFlow AI

### AI-Powered Personalized Wellness & Nutrition Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

**A production-grade, multi-user AI wellness application — built for portfolio showcase, product demos, and real-world deployment.**

[Features](#-features) · [Architecture](#-architecture) · [Setup](#-getting-started) · [Database Schema](#-database-schema) · [Screenshots](#-screenshots)

---

</div>

## ✨ Features

### 🤖 AI Co-Pilot (Gemini 2.0 Flash)
- **Streaming AI chat** — real-time conversational meal planning powered by Google Gemini
- **Structured JSON responses** — AI outputs rich meal cards with calories, protein, health scores
- **Grocery list generation** — AI builds personalized shopping lists from your wellness goals
- **Contextual recommendations** — every suggestion adapts to your dietary profile and allergies

### 🍽️ Intelligent Dashboard
- **Personalized meal feed** — Swiggy-style card UI with heart-save and cart-add interactions
- **Wellness score & streak tracker** — Apple Health-inspired progress rings
- **Calorie & macro dashboard** — daily intake tracking with visual progress bars
- **AI wellness insights** — contextual tips based on your onboarding profile

### 🛒 Full Cart & Checkout
- **Persistent cart** — localStorage primary + Supabase background sync
- **Nutrition summary** — real-time macros (calories, protein, carbs, fat) across cart items
- **Mock Swiggy delivery flow** — order confirmation, delivery tracker animation, Swiggy partner branding
- **Address selection** — multi-address checkout UI

### 👤 Multi-User Auth & Onboarding
- **Supabase Auth** — email/password signup, login, logout with persistent sessions
- **7-step onboarding wizard** — goals, dietary preferences, allergies, lifestyle metrics, budget
- **Auto profile creation** — new users get a DB profile row on first login
- **localStorage-first persistence** — instant UI, non-blocking background DB sync

### 🥦 Grocery Planner
- **AI-generated grocery plans** — personalized weekly shopping lists
- **Category grouping** — Vegetables, Proteins, Grains, etc.
- **Order via Instamart** — mock Swiggy Instamart checkout integration

### 🔍 Discover Page
- **Browse healthy meals** — filterable by cuisine, dietary tags, calorie range
- **Save to wishlist** — per-user saved meals persisted in Supabase
- **Quick add to cart** — one-click ordering with nutrition preview

---

## 🏗️ Architecture

```
SWIGGY_G/Asset-Manager/
├── artifacts/
│   ├── nutriflow/          ← React 19 + Vite frontend (main app)
│   │   ├── src/
│   │   │   ├── components/ ← UI components (Shadcn/ui + custom)
│   │   │   │   ├── layout/ ← Navbar, Layout, AuthLayout, ProtectedRoute
│   │   │   │   ├── cart/   ← CartDrawer, CartItem components
│   │   │   │   └── ui/     ← Radix UI primitives
│   │   │   ├── hooks/      ← use-auth.tsx, use-cart.tsx
│   │   │   ├── lib/        ← supabaseClient.ts, utils.ts
│   │   │   └── pages/      ← Dashboard, Chat, Discover, Grocery,
│   │   │                      Onboarding, Login, Profile, Checkout
│   │   └── vite.config.ts
│   └── api-server/         ← Hono.js API server (Gemini AI proxy)
│       └── src/routes/     ← /api/chat, /api/meals, /api/grocery
├── lib/
│   ├── api-client-react/   ← React Query hooks for API calls
│   ├── api-spec/           ← OpenAPI 3.0 specification
│   ├── api-zod/            ← Zod validation schemas
│   └── db/                 ← Drizzle ORM schema definitions
├── pnpm-workspace.yaml     ← Monorepo workspace config
└── .env.example            ← Environment variable template
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite 7 |
| **Routing** | Wouter (lightweight SPA router) |
| **Styling** | Tailwind CSS v4, Framer Motion animations |
| **UI Components** | Shadcn/ui (Radix UI primitives) |
| **State/Data** | React Query (TanStack Query v5) |
| **Auth & Database** | Supabase (PostgreSQL + Row Level Security) |
| **AI Engine** | Google Gemini 2.0 Flash (streaming) |
| **API Server** | Hono.js (Node.js) |
| **Monorepo** | pnpm workspaces |
| **Forms** | React Hook Form + Zod validation |

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- pnpm ≥ 9 (`npm install -g pnpm`)
- A [Supabase](https://supabase.com) account (free tier works)
- A [Google AI Studio](https://aistudio.google.com) API key (free)

### 1. Clone the repository

```bash
git clone https://github.com/gnanendramunagapaka/NUTRIFLOW_AI.git
cd NUTRIFLOW_AI
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
GEMINI_API_KEY=your-gemini-api-key
PORT=5173
BASE_PATH=/
```

### 4. Set up the Supabase database

Run the SQL schema in your Supabase SQL editor:

<details>
<summary>📋 Click to expand full database schema</summary>

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Profiles
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  goal TEXT DEFAULT 'Stay Healthy',
  dietary_preferences TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  workout_frequency TEXT,
  water_intake TEXT,
  meal_habits TEXT,
  budget TEXT,
  age INTEGER,
  weight NUMERIC,
  height NUMERIC,
  onboarding_completed BOOLEAN DEFAULT false,
  wellness_score INTEGER DEFAULT 72,
  streak INTEGER DEFAULT 1,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cart Items
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  type TEXT DEFAULT 'meal',
  calories INTEGER,
  protein NUMERIC,
  image_url TEXT,
  cuisine TEXT,
  health_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Conversations
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Messages
CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved Meals
CREATE TABLE saved_meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_id TEXT NOT NULL,
  name TEXT NOT NULL,
  calories INTEGER,
  protein NUMERIC,
  image_url TEXT,
  cuisine TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, meal_id)
);

-- Grocery Plans
CREATE TABLE grocery_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Weekly Plan',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grocery Plan Items
CREATE TABLE grocery_plan_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES grocery_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  quantity TEXT DEFAULT '1',
  unit TEXT DEFAULT 'unit',
  nutrition_note TEXT,
  checked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_plan_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY "Users own their profile" ON user_profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users own their cart" ON cart_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their conversations" ON ai_conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their messages" ON ai_messages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their saved meals" ON saved_meals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their grocery plans" ON grocery_plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their grocery items" ON grocery_plan_items FOR ALL USING (auth.uid() = user_id);
```

</details>

### 5. Start the development server

**Terminal 1 — Frontend:**
```bash
PORT=5173 BASE_PATH=/ npx pnpm --filter @workspace/nutriflow run dev
```

**Terminal 2 — API Server (for AI chat):**
```bash
PORT=8080 GEMINI_API_KEY=your-key NEXT_PUBLIC_SUPABASE_URL=your-url NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key npx pnpm --filter @workspace/api-server run start
```

Open **http://localhost:5173** in your browser.

---

## 🗄️ Database Schema

The app uses **Supabase** (PostgreSQL) with **Row Level Security** — every user can only access their own data.

| Table | Purpose |
|-------|---------|
| `user_profiles` | Stores wellness goals, dietary preferences, body metrics |
| `cart_items` | Per-user cart with meal/grocery items |
| `ai_conversations` | Chat history grouped by conversation |
| `ai_messages` | Individual chat messages (user + AI) |
| `saved_meals` | Bookmarked meals from Discover page |
| `grocery_plans` | AI-generated weekly grocery plans |
| `grocery_plan_items` | Individual items within grocery plans |

---

## 🔒 Security Notes

- All `.env` files are excluded from git via `.gitignore`
- Supabase API keys are loaded from environment variables only
- Row Level Security (RLS) is enabled on all tables — users cannot access other users' data
- The Supabase anon key is safe to expose to the browser (it's restricted by RLS)
- Never commit your `GEMINI_API_KEY` or database connection strings

---

## 📱 Screenshots

> Signup → 7-step onboarding → personalized AI dashboard → streaming AI chat → cart → checkout

The app features:
- 🌙 Dark/light mode with smooth transitions
- 📱 Fully responsive mobile-first design
- ✨ Framer Motion animations throughout
- 🎨 Premium glassmorphism UI with emerald & primary color palette

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "feat: add my feature"`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with ❤️ by [Gnanendra Munagapaka](https://github.com/gnanendramunagapaka)

**Stack:** React 19 · TypeScript · Vite · Supabase · Gemini AI · Tailwind CSS · Framer Motion

</div>
