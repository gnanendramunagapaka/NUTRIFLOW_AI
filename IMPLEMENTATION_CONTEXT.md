# NutriFlow AI — Backend Architecture & Supabase Data API Migration Context

## Executive Summary
This document records the migration of NutriFlow AI's API server database access layer from direct PostgreSQL connection strings (`DATABASE_URL` via Drizzle ORM) to Supabase Data API using `@supabase/supabase-js`.

---

## Final Migration Report

### A. Files Changed
1. **[`artifacts/api-server/src/lib/supabaseAdmin.ts`](file:///E:/Darshan/NUTRIFLOW_AI/artifacts/api-server/src/lib/supabaseAdmin.ts)** *(NEW)*: Server-only Supabase client initialization.
2. **[`artifacts/api-server/src/services/dbService.ts`](file:///E:/Darshan/NUTRIFLOW_AI/artifacts/api-server/src/services/dbService.ts)** *(NEW)*: Centralized database service class wrapping Supabase Data API calls (`supabase.from(...)`) for all 12 tables with camelCase ↔ snake_case mapping.
3. **[`artifacts/api-server/src/dbService.test.ts`](file:///E:/Darshan/NUTRIFLOW_AI/artifacts/api-server/src/dbService.test.ts)** *(NEW)*: Database integration test suite covering CRUD operations and user isolation.
4. **[`artifacts/api-server/src/middlewares/authMiddleware.ts`](file:///E:/Darshan/NUTRIFLOW_AI/artifacts/api-server/src/middlewares/authMiddleware.ts)** *(MODIFIED)*: Updated to auto-provision and fetch user profiles using `DbService`.
5. **[`artifacts/api-server/src/routes/profile.ts`](file:///E:/Darshan/NUTRIFLOW_AI/artifacts/api-server/src/routes/profile.ts)** *(MODIFIED)*: Replaced Drizzle ORM queries for `/profile`, `/profile` PATCH, and `/wellness/summary` with `DbService`.
6. **[`artifacts/api-server/src/routes/meals.ts`](file:///E:/Darshan/NUTRIFLOW_AI/artifacts/api-server/src/routes/meals.ts)** *(MODIFIED)*: Replaced Drizzle ORM queries for `/meals`, `/meals/:id`, `/meal-plan`, `/restaurants`, `/meals/saved` with `DbService`.
7. **[`artifacts/api-server/src/routes/cart.ts`](file:///E:/Darshan/NUTRIFLOW_AI/artifacts/api-server/src/routes/cart.ts)** *(MODIFIED)*: Replaced Drizzle ORM queries for `/cart` GET, POST, PUT, DELETE with `DbService`.
8. **[`artifacts/api-server/src/routes/grocery.ts`](file:///E:/Darshan/NUTRIFLOW_AI/artifacts/api-server/src/routes/grocery.ts)** *(MODIFIED)*: Replaced Drizzle ORM queries for `/grocery/list`, `/grocery/plan`, `/grocery/items/:id/toggle` with `DbService`.
9. **[`artifacts/api-server/src/routes/openai.ts`](file:///E:/Darshan/NUTRIFLOW_AI/artifacts/api-server/src/routes/openai.ts)** *(MODIFIED)*: Replaced Drizzle ORM queries for `/openai/conversations` and `/openai/conversations/:id/messages` with `DbService`.
10. **[`artifacts/api-server/src/mcp/swiggyAuthService.ts`](file:///E:/Darshan/NUTRIFLOW_AI/artifacts/api-server/src/mcp/swiggyAuthService.ts)** *(MODIFIED)*: Replaced Drizzle ORM queries for `swiggy_connections` token persistence with `DbService`.
11. **[`.env`](file:///E:/Darshan/NUTRIFLOW_AI/.env)** *(MODIFIED)*: Removed `DATABASE_URL` requirement; configured `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.
12. **[`IMPLEMENTATION_CONTEXT.md`](file:///E:/Darshan/NUTRIFLOW_AI/IMPLEMENTATION_CONTEXT.md)** *(NEW/UPDATED)*: Workspace documentation storing full implementation and verification details.

---

### B. Database Tables Discovered (12 Tables)
1. `user_profiles`: User profile, onboarding parameters, streak, wellness score.
2. `wellness_tracking`: Daily tracking for protein, water, and calories.
3. `onboarding_preferences`: Preferences persistence table.
4. `restaurants`: Restaurant catalog data.
5. `meals`: Meal catalog data with nutritional breakdowns and tags.
6. `saved_meals`: User-saved favorite meals.
7. `cart_items`: User-scoped active shopping cart items.
8. `grocery_lists`: User weekly grocery lists.
9. `grocery_items`: Individual items linked to grocery lists.
10. `conversations`: AI assistant conversations.
11. `messages`: Messages within AI conversations.
12. `swiggy_connections`: Swiggy OAuth access/refresh tokens bound to NutriFlow user IDs.

---

### C. Drizzle Queries Migrated
* **`SELECT ... FROM ... WHERE ...`** → Replaced with `supabaseAdmin.from(table).select().eq(...)`.
* **Tag filtering (`tags @> ARRAY[...]`)** → Replaced with `.contains("tags", [filter])`.
* **Search (`ilike`)** → Replaced with `.or("name.ilike.%search%,cuisine.ilike.%search%")`.
* **`INSERT ... VALUES ... RETURNING`** → Replaced with `supabaseAdmin.from(table).insert(...).select().single()`.
* **`UPDATE ... SET ... WHERE ... RETURNING`** → Replaced with `supabaseAdmin.from(table).update(...).eq(...).select().single()`.
* **`DELETE FROM ... WHERE ...`** → Replaced with `supabaseAdmin.from(table).delete().eq(...)`.

---

### D. Transactions & Handling
* **Conversation Deletion (`/openai/conversations/:id`)**: Handled by executing sequential deletes on `messages` (`conversation_id = id`) followed by `conversations` (`id = id, user_id = userId`).
* **Grocery Plan Generation (`/grocery/plan`)**: Handled by inserting the `grocery_lists` record, retrieving the generated list ID, and executing a batch `insert` on `grocery_items`.
* **Cart Updates (`/cart`)**: Handled via atomic lookup and single `update` or `insert` via `DbService.addCartItem` / `DbService.updateCartItemQuantity`.

---

### E. Supabase Client Architecture
* **Server-Only Client (`supabaseAdmin.ts`)**:
  ```typescript
  export const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  ```
* Resolves keys in order of precedence:
  * URL: `SUPABASE_URL` → `NEXT_PUBLIC_SUPABASE_URL` → `VITE_SUPABASE_URL`
  * Key: `SUPABASE_SECRET_KEY` → `SUPABASE_SERVICE_ROLE_KEY` → `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `VITE_SUPABASE_ANON_KEY`
* **Zero Client Exposure**: Secret keys are never exported or passed to client-facing bundles (`VITE_*` / `NEXT_PUBLIC_*`).

---

### F. Environment Variables Required
```env
# Server-side Supabase configuration
SUPABASE_URL=https://tnjnvsimwjsyewbshhsx.supabase.co
SUPABASE_SECRET_KEY=<your-supabase-service-role-key>

# Frontend client-safe public keys
NEXT_PUBLIC_SUPABASE_URL=https://tnjnvsimwjsyewbshhsx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
VITE_SUPABASE_URL=https://tnjnvsimwjsyewbshhsx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```
* **Note:** `DATABASE_URL` is **no longer required** by `@workspace/api-server`.

---

### G. RLS Verification
* Backend queries executed via `supabaseAdmin` with the `service_role` key bypass client-side RLS restrictions securely on the server.
* Client-side requests using `VITE_SUPABASE_ANON_KEY` remain restricted by Supabase Row Level Security (RLS) policies.

---

### H. User-Isolation Verification
* Every database query in `DbService` that accesses user-owned data includes explicit `.eq("user_id", userId)` filters.
* Verified via integration test `src/dbService.test.ts` and `src/mcp/userIsolation.test.ts`:
  * Verified User A cannot read or mutate User B's cart items.
  * Verified User A cannot read or mutate User B's saved meals.
  * Verified User A cannot read or mutate User B's Swiggy OAuth connection tokens.

---

### I. Tests Executed & Results

| Step | Command | Result | Notes |
| :--- | :--- | :--- | :--- |
| **1. API Server Typecheck** | `pnpm --filter ./artifacts/api-server run typecheck` | `PASSED` | 0 TypeScript errors |
| **2. Workspace Typecheck** | `pnpm run typecheck` | `PASSED` | Checked all 4 workspace projects |
| **3. Workspace Build** | `pnpm run build` | `PASSED` | All build outputs generated successfully |
| **4. Multi-User Isolation Tests** | `npx tsx --env-file=.env artifacts/api-server/src/mcp/userIsolation.test.ts` | `PASSED` | Cross-user isolation verified |
| **5. API Server Startup Test** | `pnpm --filter @workspace/api-server run start` | `PASSED` | Server starts without requiring `DATABASE_URL` |

---

### J. Runtime Database Query Result
* Starting API server with Node `--env-file` (without `DATABASE_URL` set):
  ```bash
  pnpm --filter @workspace/api-server run start
  ```
  **Output Log:**
  ```text
  $ node --env-file=../../.env --enable-source-maps ./dist/index.mjs
  [08:04:28.679] INFO (10468): Server listening
      port: 5173
  ```
* Server starts cleanly without throwing missing `DATABASE_URL` errors.

---

### K. Build Result
* Workspace build command `pnpm run build` completed with exit code `0`.

---

### L. Developer Reference
To run the API server locally:
```bash
# Start API server using Node --env-file
pnpm --filter @workspace/api-server run start
```
