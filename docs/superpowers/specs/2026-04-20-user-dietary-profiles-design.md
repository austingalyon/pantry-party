# User Dietary Profiles Design

**Date:** 2026-04-20
**Status:** Approved

## Goal

Move allergies and dietary restrictions from room-level settings to persistent user profiles. Room constraints merge all participants' profiles (locked, non-editable) with additional room-level overrides (toggleable). Cooking methods, cuisine preferences, meal type, and time limit remain room-level only.

## Changes

### 1. New `userProfiles` table

```typescript
userProfiles: defineTable({
  userId: v.string(),        // Clerk subject ID
  allergies: v.array(v.string()),
  dietFilters: v.array(v.string()),
  updatedAt: v.number(),
}).index("by_user", ["userId"]),
```

One record per user. Created on first save. Stores only allergies and dietary restrictions — not cooking methods, cuisine, etc.

### 2. User profile mutations and queries

In a new `convex/userProfiles.ts`:

- **`getMyProfile`** (query): Returns the current user's profile. Uses `ctx.auth.getUserIdentity()` to get `userId`, queries by `by_user` index.
- **`updateMyProfile`** (mutation): Upserts the user's profile with new allergies/dietFilters. Auth required.
- **`getProfilesForRoom`** (query): Given a `roomId`, looks up all participants, then fetches their profiles. Returns the merged (union) set of allergies and dietFilters across all participants.

### 3. Dietary Profile Modal

New component: `src/components/DietaryProfileModal.tsx`

- Trigger: A settings/dietary icon button in the navbar, visible when signed in. Since the navbar is in `Layout.astro` (Astro component using Clerk Astro components), and the modal needs React + Convex, the icon button will be a small React island (`DietaryProfileButton`) that renders the icon and controls the modal.
- Modal contents: Same allergy chips (with custom allergy input) and dietary restriction chips currently in `ConstraintsForm.tsx`. Save button persists to `userProfiles` table.
- Shares the same `ALLERGY_OPTIONS` and `DIET_OPTIONS` constants — extract these to a shared `src/components/constants.ts` file.

### 4. Refactor ConstraintsForm

`src/components/ConstraintsForm.tsx` changes:

- **Allergies & diet sections**: Show the merged set from all participants' profiles. Each chip that comes from a user profile is visually locked (different style, non-toggleable). Additional room-level chips can be toggled on/off as before.
- **Cooking methods, cuisine, meal type, time limit**: Unchanged — remain room-level toggleable settings.
- Queries `getProfilesForRoom` to get the merged user-level constraints.
- The room `constraints` record continues to store room-level overrides for allergies/dietFilters (the ones toggled on beyond user profiles), plus the existing cooking methods, cuisine, meal type, time limit.

### 5. Generation changes

`convex/recipeGeneration.ts`:

- Before building the prompt, fetch merged user profiles via `getProfilesForRoom`
- Combine: user-profile allergies/diets (union of all participants) + room-level allergy/diet overrides + room-level cooking methods, cuisine, meal type, time limit
- Pass the combined set to `buildUserPrompt` as before — no prompt format changes needed, just the data source changes

### 6. Navbar integration

The dietary profile button needs to be a React island since it requires Clerk auth context and Convex. Options:

- Add a `DietaryProfileButton` React component with `client:only="react"` in `Layout.astro`, wrapped in `ConvexClientProvider`, placed next to `<UserButton />` inside `<SignedIn>`.
- This component renders a small icon button that opens the `DietaryProfileModal`.

Note: Since `Layout.astro` currently uses Clerk Astro components (`<SignedIn>`, `<UserButton />`), and we need a React island inside `<SignedIn>`, we'll place the React island adjacent to `<UserButton />` inside the `<SignedIn>` block. The Astro `<SignedIn>` component handles visibility; the React island handles the modal.

## Files affected

| File | Change |
|------|--------|
| `convex/schema.ts` | Add `userProfiles` table |
| `convex/userProfiles.ts` | New file: `getMyProfile`, `updateMyProfile`, `getProfilesForRoom` |
| `src/components/constants.ts` | New file: shared `ALLERGY_OPTIONS`, `DIET_OPTIONS` |
| `src/components/DietaryProfileModal.tsx` | New file: modal with allergy/diet chips |
| `src/components/DietaryProfileButton.tsx` | New file: navbar icon + modal trigger, wrapped in ConvexClientProvider |
| `src/components/ConstraintsForm.tsx` | Remove allergy/diet editing, show merged view with locked chips + room overrides |
| `convex/recipeGeneration.ts` | Fetch merged user profiles, combine with room constraints |
| `src/layouts/Layout.astro` | Add `DietaryProfileButton` React island in navbar |

## Out of scope

- Migrating existing room constraint data to user profiles
- Showing which participant contributed which restriction
- User profile page beyond the modal
