# Auth Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden Convex/Clerk auth setup — protect routes, re-enable backend auth, deduplicate client code.

**Architecture:** Clerk middleware protects routes at the edge. Convex mutations enforce auth server-side. A single shared `ConvexClientProvider` eliminates duplicated client/provider setup across React islands.

**Tech Stack:** Astro, Clerk (`@clerk/astro`, `@clerk/clerk-react`), Convex (`convex/react-clerk`), React

---

### Task 1: Use env var for Clerk domain in auth.config.ts

**Files:**
- Modify: `convex/auth.config.ts`

- [ ] **Step 1: Replace hardcoded domain with env var**

Replace the entire file content with:

```typescript
import type { AuthConfig } from "convex/server";

const authConfig: AuthConfig = {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ]
};

export default authConfig;
```

- [ ] **Step 2: Verify CLERK_JWT_ISSUER_DOMAIN is documented**

Check `.env.example` includes `CLERK_JWT_ISSUER_DOMAIN`. If not, add it:

```
CLERK_JWT_ISSUER_DOMAIN=https://your-clerk-instance.clerk.accounts.dev/
```

- [ ] **Step 3: Commit**

```bash
git add convex/auth.config.ts .env.example
git commit -m "feat: use env var for Clerk JWT issuer domain"
```

---

### Task 2: Add middleware route protection

**Files:**
- Modify: `src/middleware.ts`

- [ ] **Step 1: Update middleware with route matcher**

Replace the entire file content with:

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/astro/server";

const isProtectedRoute = createRouteMatcher(["/room(.*)", "/create-room"]);

export const onRequest = clerkMiddleware((auth, context) => {
  if (isProtectedRoute(context.request)) {
    auth().protect();
  }
});
```

This uses Clerk's `auth().protect()` which automatically redirects unauthenticated users to the Clerk sign-in page with a `returnBackUrl` pointing to the original request URL.

- [ ] **Step 2: Verify build compiles**

Run: `npx astro check`
Expected: No new errors from middleware changes.

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: protect /room and /create-room routes with Clerk middleware"
```

---

### Task 3: Re-enable auth in addIngredient

**Files:**
- Modify: `convex/ingredients.ts`

- [ ] **Step 1: Replace temp user with auth check in addIngredient**

In `convex/ingredients.ts`, replace the handler for `addIngredient` (lines 19-61). The new handler:

```typescript
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const userName = identity.name || identity.email || "Anonymous";

    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    // Normalize ingredient name (lowercase, trim)
    const normalizedName = args.name.toLowerCase().trim();

    // Check for duplicates
    const existingIngredient = await ctx.db
      .query("ingredients")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("name"), normalizedName))
      .first();

    if (existingIngredient) {
      // Update instead of creating duplicate
      await ctx.db.patch(existingIngredient._id, {
        amount: args.amount,
        unit: args.unit,
        rawText: args.rawText,
      });
      return existingIngredient._id;
    }

    return await ctx.db.insert("ingredients", {
      roomId: args.roomId,
      userId,
      userName,
      name: normalizedName,
      amount: args.amount,
      unit: args.unit,
      rawText: args.rawText,
      detectedFrom: args.detectedFrom,
      confidence: args.confidence,
      addedAt: Date.now(),
    });
  },
```

- [ ] **Step 2: Commit**

```bash
git add convex/ingredients.ts
git commit -m "feat: re-enable auth in addIngredient mutation"
```

---

### Task 4: Re-enable auth in removeIngredient

**Files:**
- Modify: `convex/ingredients.ts`

- [ ] **Step 1: Replace handler for removeIngredient**

In `convex/ingredients.ts`, replace the handler for `removeIngredient` (lines 69-83). The new handler adds auth and participant verification:

```typescript
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const ingredient = await ctx.db.get(args.ingredientId);
    if (!ingredient) {
      throw new Error("Ingredient not found");
    }

    const room = await ctx.db.get(ingredient.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    // Verify user is a participant in this room
    const participant = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", ingredient.roomId))
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    if (!participant) {
      throw new Error("Not a participant in this room");
    }

    await ctx.db.delete(args.ingredientId);
  },
```

- [ ] **Step 2: Commit**

```bash
git add convex/ingredients.ts
git commit -m "feat: re-enable auth in removeIngredient mutation"
```

---

### Task 5: Re-enable auth in generateRecipes

**Files:**
- Modify: `convex/recipeGeneration.ts`

- [ ] **Step 1: Uncomment auth checks in generateRecipes**

In `convex/recipeGeneration.ts`, replace lines 16-37 (from handler start through the disabled participant check) with:

```typescript
  handler: async (ctx, args): Promise<{ recipeIds: string[]; count: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const count = args.count || 10;

    // Get room data
    const room = await ctx.runQuery(api.rooms.getRoom, { roomId: args.roomId });
    if (!room) {
      throw new Error("Room not found");
    }

    const isParticipant = room.participants.some(
      (p: any) => p.userId === identity.subject
    );
    if (!isParticipant) {
      throw new Error("Not a participant in this room");
    }
```

Everything after this (the `updateRoomStatus` call through the end of the handler) stays the same.

- [ ] **Step 2: Commit**

```bash
git add convex/recipeGeneration.ts
git commit -m "feat: re-enable auth in generateRecipes action"
```

---

### Task 6: Deduplicate ConvexClientProvider

**Files:**
- Modify: `src/components/ConvexClientProvider.tsx`

- [ ] **Step 1: Clean up ConvexClientProvider**

Replace the entire file with:

```tsx
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { useMemo } from "react";

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convex = useMemo(() => {
    const url = import.meta.env.PUBLIC_CONVEX_URL;
    if (!url) {
      throw new Error("PUBLIC_CONVEX_URL is not set. Add it to your .env.local file.");
    }
    return new ConvexReactClient(url);
  }, []);

  return (
    <ClerkProvider publishableKey={import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

Key changes:
- Added `ClerkProvider` wrapping (previously only had `ConvexProviderWithClerk`)
- Removed `console.log` debugging
- Throws instead of silently falling back to localhost

- [ ] **Step 2: Commit**

```bash
git add src/components/ConvexClientProvider.tsx
git commit -m "refactor: make ConvexClientProvider the single provider wrapper"
```

---

### Task 7: Refactor RoomContent to use shared provider

**Files:**
- Modify: `src/components/RoomContent.tsx`

- [ ] **Step 1: Replace RoomContent with shared provider usage**

Replace the entire file with:

```tsx
import { useMutation } from "convex/react";
import { useEffect } from "react";
import RoomData from "./RoomData";
import IngredientList from "./IngredientList";
import RecipeGeneration from "./RecipeGeneration";
import ConstraintsForm from "./ConstraintsForm";
import ParticipantsList from "./ParticipantsList";
import ConvexClientProvider from "./ConvexClientProvider";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface RoomContentProps {
  roomId: Id<"rooms">;
}

function RoomContentInner({ roomId }: RoomContentProps) {
  const joinRoom = useMutation(api.rooms.joinRoom);

  // Auto-join room when component mounts
  useEffect(() => {
    const autoJoin = async () => {
      try {
        await joinRoom({ roomId });
      } catch (err) {
        // Non-fatal - user might already be a participant
      }
    };
    autoJoin();
  }, [roomId, joinRoom]);

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Room Header */}
        <RoomData roomId={roomId} />

        {/* Ingredients Section */}
        <IngredientList roomId={roomId} />

        {/* Recipes Section */}
        <RecipeGeneration roomId={roomId} />
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Participants */}
        <ParticipantsList roomId={roomId} />

        {/* Constraints */}
        <ConstraintsForm roomId={roomId} />
      </div>
    </div>
  );
}

export default function RoomContent({ roomId }: RoomContentProps) {
  return (
    <ConvexClientProvider>
      <RoomContentInner roomId={roomId} />
    </ConvexClientProvider>
  );
}
```

Key changes:
- Removed duplicate `ClerkProvider`, `ConvexProviderWithClerk`, `ConvexReactClient` setup
- Imports and uses shared `ConvexClientProvider`
- Removed all `console.log` debugging

- [ ] **Step 2: Commit**

```bash
git add src/components/RoomContent.tsx
git commit -m "refactor: use shared ConvexClientProvider in RoomContent"
```

---

### Task 8: Refactor CreateRoomForm to use shared provider

**Files:**
- Modify: `src/components/CreateRoomForm.tsx`

- [ ] **Step 1: Replace CreateRoomForm with shared provider usage**

Replace the entire file with:

```tsx
import { useMutation } from "convex/react";
import { useState } from "react";
import ConvexClientProvider from "./ConvexClientProvider";
import { api } from "../../convex/_generated/api";

function CreateRoomFormInner() {
  const [roomName, setRoomName] = useState("");
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRoom = useMutation(api.rooms.createRoom);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsCreating(true);

    try {
      const roomId = await createRoom({ name: roomName });
      setCreatedRoomId(roomId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setIsCreating(false);
    }
  };

  const roomUrl = createdRoomId
    ? `${window.location.origin}/room/${createdRoomId}`
    : "";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(roomUrl);
    alert("Room link copied to clipboard!");
  };

  if (createdRoomId) {
    return (
      <div className="mt-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800 mb-2 font-semibold">
            ✅ Room created! Share this link:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={roomUrl}
              readOnly
              className="flex-1 px-4 py-2 bg-white border border-green-300 rounded-lg text-sm"
            />
            <button
              onClick={copyToClipboard}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              Copy
            </button>
          </div>
          <a
            href={`/room/${createdRoomId}`}
            className="inline-block mt-4 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition"
          >
            Enter Room →
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="room-name"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Room Name
        </label>
        <input
          type="text"
          id="room-name"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="e.g., Friday Dinner Party"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isCreating}
        className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isCreating ? "Creating..." : "Create Room"}
      </button>
    </form>
  );
}

export default function CreateRoomForm() {
  return (
    <ConvexClientProvider>
      <CreateRoomFormInner />
    </ConvexClientProvider>
  );
}
```

Key changes:
- Removed duplicate `ClerkProvider`, `ConvexProviderWithClerk`, `ConvexReactClient` setup
- Imports and uses shared `ConvexClientProvider`
- Removed all `console.log` debugging

- [ ] **Step 2: Commit**

```bash
git add src/components/CreateRoomForm.tsx
git commit -m "refactor: use shared ConvexClientProvider in CreateRoomForm"
```

---

### Task 9: Refactor JoinRoomForm to use shared provider

**Files:**
- Modify: `src/components/JoinRoomForm.tsx`

- [ ] **Step 1: Replace JoinRoomForm with shared provider usage**

Replace the entire file with:

```tsx
import { useMutation } from "convex/react";
import { useState } from "react";
import ConvexClientProvider from "./ConvexClientProvider";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

function JoinRoomFormInner() {
  const [roomId, setRoomId] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joinRoom = useMutation(api.rooms.joinRoom);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsJoining(true);

    try {
      await joinRoom({ roomId: roomId as Id<"rooms"> });
      window.location.href = `/room/${roomId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room");
      setIsJoining(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="room-id"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Room ID
        </label>
        <input
          type="text"
          id="room-id"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="Enter room ID"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isJoining}
        className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isJoining ? "Joining..." : "Join Room"}
      </button>
    </form>
  );
}

export default function JoinRoomForm() {
  return (
    <ConvexClientProvider>
      <JoinRoomFormInner />
    </ConvexClientProvider>
  );
}
```

Key changes:
- Removed duplicate `ClerkProvider`, `ConvexProviderWithClerk`, `ConvexReactClient` setup
- Imports and uses shared `ConvexClientProvider`
- Removed all `console.log` debugging

- [ ] **Step 2: Commit**

```bash
git add src/components/JoinRoomForm.tsx
git commit -m "refactor: use shared ConvexClientProvider in JoinRoomForm"
```

---

### Task 10: Final build verification

- [ ] **Step 1: Run type check**

Run: `npx astro check`
Expected: No new type errors.

- [ ] **Step 2: Run build**

Run: `npx convex codegen && npx astro check && npx astro build`
Expected: Clean build with no errors.

- [ ] **Step 3: Commit any fixes if needed**

If the build reveals issues, fix them and commit with a descriptive message.
