# Auth Hardening Design

**Date:** 2026-04-20
**Status:** Approved

## Goal

Ensure Convex and Clerk setups are sound, and protect room-related routes behind authentication.

## Changes

### 1. Middleware route protection

Update `src/middleware.ts` to use Clerk's `createRouteMatcher` to protect `/room/*` and `/create-room`.

- Unauthenticated requests to protected routes redirect to Clerk sign-in with `returnBackUrl` so users return to their intended destination after sign-in.
- Public routes (`/`, `/about`, `/join-room`) remain open.

**File:** `src/middleware.ts`

### 2. Re-enable backend auth checks

Three Convex functions have auth commented out or stubbed:

- **`convex/ingredients.ts` — `addIngredient`**: Replace `tempUserId`/`tempUserName` hack with `ctx.auth.getUserIdentity()`. Follow the same pattern used in `addIngredientsBatch`.
- **`convex/ingredients.ts` — `removeIngredient`**: Add `ctx.auth.getUserIdentity()` check and verify the user is a room participant.
- **`convex/recipeGeneration.ts` — `generateRecipes`**: Uncomment the existing auth and participant checks (lines 17-22, 31-36).

All other mutations (`createRoom`, `joinRoom`, `voteRecipe`, `updateConstraints`, `addIngredientsBatch`) already have proper auth checks — no changes needed.

### 3. Deduplicate Convex client instantiation

Currently `RoomContent.tsx`, `CreateRoomForm.tsx`, and `ConvexClientProvider.tsx` each create their own `ConvexReactClient` with copy-pasted fallback logic and `ClerkProvider` wrapping.

**Fix:**
- `ConvexClientProvider.tsx` becomes the single source of truth for `ClerkProvider` + `ConvexProviderWithClerk` + `ConvexReactClient` instantiation, accepting `children` as a prop.
- `RoomContent.tsx` and `CreateRoomForm.tsx` each have a default export that wraps their inner component with `<ConvexClientProvider>`. The key difference is they import and reuse the shared provider instead of duplicating client creation and `ClerkProvider` setup.
- Astro pages continue to use `client:only="react"` on the top-level component (Astro islands can't nest React children from `.astro` templates).
- Remove all `console.log` debugging from client initialization code.

### 4. Use env var for Clerk domain

Replace the hardcoded Clerk domain in `convex/auth.config.ts` with `process.env.CLERK_JWT_ISSUER_DOMAIN` so it works across environments without code changes.

**File:** `convex/auth.config.ts`

## Files affected

| File | Change |
|------|--------|
| `src/middleware.ts` | Add route matcher for protected routes |
| `convex/ingredients.ts` | Re-enable auth in `addIngredient` and `removeIngredient` |
| `convex/recipeGeneration.ts` | Uncomment auth + participant checks in `generateRecipes` |
| `src/components/ConvexClientProvider.tsx` | Becomes single provider wrapper |
| `src/components/RoomContent.tsx` | Remove provider wrapping, export inner component |
| `src/components/CreateRoomForm.tsx` | Remove provider wrapping, export inner component |
| `src/pages/room/[roomId].astro` | No change (already uses RoomContent with `client:only`) |
| `src/pages/create-room.astro` | No change (already uses CreateRoomForm with `client:only`) |
| `convex/auth.config.ts` | Use env var for Clerk domain |

## Out of scope

- Query-level auth (read operations like `getRoom`, `getIngredients`, etc. remain open — acceptable since room IDs are unguessable Convex IDs)
- Additional auth flows (password reset, email verification, etc.)
- Role-based access control (owner vs participant permissions)
