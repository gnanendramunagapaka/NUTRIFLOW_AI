# NutriFlow AI

NutriFlow AI is an intelligent nutrition and wellness platform that delivers personalized meal plans, grocery shopping, and AI-powered health coaching — tailored for the Indian market.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `VITE_SUPABASE_URL` — Supabase project URL
- Required env: `VITE_SUPABASE_ANON_KEY` — Supabase anonymous key

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 18 + Vite, TailwindCSS, shadcn/ui
- Auth: Supabase (email + Google OAuth)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Deployment: Vercel (frontend at `artifacts/nutriflow`, output `dist/public`)

## Where things live

- `artifacts/nutriflow/` — main React frontend application
- `artifacts/nutriflow/src/pages/` — all route-level page components
- `artifacts/nutriflow/src/components/` — shared UI components
- `artifacts/nutriflow/src/lib/supabase.ts` — Supabase client & auth helpers
- `artifacts/api-server/` — Express API server
- `lib/` — shared libraries (integrations, API client, DB schema)

## Architecture decisions

- Auth is handled entirely via Supabase; no custom auth server needed.
- Multi-user data isolation is enforced via `user_id` scoping in localStorage keys and DB queries.
- The frontend is deployed as a standalone Vite SPA on Vercel from `artifacts/nutriflow`.
- Mock data is used for Swiggy/grocery integrations until live APIs are available.
- AI recommendations are generated server-side via OpenAI and cached per user session.

## Product

NutriFlow AI offers:
- **Personalized Onboarding**: Collects health goals, dietary preferences, and activity levels.
- **AI Dashboard**: Displays daily nutrition targets, macro tracking, and hydration goals.
- **Discover**: Curated healthy meal and restaurant suggestions powered by AI.
- **AI Copilot**: Real-time nutrition chat assistant for meal planning and advice.
- **Grocery Store**: Smart healthy grocery shopping with cart and checkout flow.
- **Profile**: User health metrics, preferences, and account management.

## User preferences

- Indian-market friendly content (INR pricing, Indian food items, Indian names).
- Dark/premium UI aesthetic inspired by Swiggy, Zomato, and Apple Health.
- No placeholder or Lorem ipsum text anywhere in the UI.

## Gotchas

- Always run `pnpm run typecheck` before building to catch TS errors early.
- Vercel root directory must be set to `artifacts/nutriflow`, output to `dist/public`.
- Supabase email confirmation redirects use `window.location.origin` (no hardcoded localhost).
- Auth callback route `/auth/callback` handles post-verification session restoration.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
- See `artifacts/nutriflow/src/lib/supabase.ts` for the canonical Supabase auth integration.
- See `artifacts/nutriflow/vite.config.ts` for the Vite build configuration.
