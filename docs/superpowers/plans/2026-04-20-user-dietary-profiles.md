# User Dietary Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move allergies and dietary restrictions to persistent user profiles, with merged room-level display showing locked user chips + toggleable room overrides.

**Architecture:** New `userProfiles` table stores per-user allergies/dietFilters. A new query merges all room participants' profiles into a union set. The room constraints form shows user-profile chips as locked, with additional room-level chips toggleable. A dietary profile modal in the navbar lets users edit their profile. Recipe generation combines both sources.

**Tech Stack:** Convex (table, queries, mutations), React (modal, chips), Astro (navbar island)

---

### Task 1: Extract shared constants

**Files:**
- Create: `src/components/constants.ts`
- Modify: `src/components/ConstraintsForm.tsx`

- [ ] **Step 1: Create constants file**

Create `src/components/constants.ts`:

```typescript
export const DIET_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Dairy-Free",
  "Keto",
  "Paleo",
  "Low-Carb",
  "Low-Sodium",
  "Pescatarian",
  "Halal",
  "Kosher",
];

export const ALLERGY_OPTIONS = [
  "Nuts",
  "Peanuts",
  "Shellfish",
  "Dairy",
  "Eggs",
  "Soy",
  "Wheat",
  "Fish",
  "Sesame",
];

export const COOKING_METHOD_OPTIONS = [
  "Grilling",
  "Baking",
  "Stovetop",
  "Slow Cooker",
  "Instant Pot",
  "Air Fryer",
  "No Cook",
];

export const CUISINE_OPTIONS = [
  "Italian",
  "Mexican",
  "Asian",
  "Indian",
  "Mediterranean",
  "American",
  "Thai",
  "Japanese",
  "French",
];
```

- [ ] **Step 2: Update ConstraintsForm to import from constants**

In `src/components/ConstraintsForm.tsx`, remove the four `const` arrays (`DIET_OPTIONS`, `ALLERGY_OPTIONS`, `COOKING_METHOD_OPTIONS`, `CUISINE_OPTIONS`) and replace with:

```typescript
import { DIET_OPTIONS, ALLERGY_OPTIONS, COOKING_METHOD_OPTIONS, CUISINE_OPTIONS } from "./constants";
```

- [ ] **Step 3: Commit**

```bash
git add src/components/constants.ts src/components/ConstraintsForm.tsx
git commit -m "refactor: extract shared option constants"
```

---

### Task 2: Add userProfiles table and backend

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/userProfiles.ts`

- [ ] **Step 1: Add userProfiles table to schema**

In `convex/schema.ts`, add after the `rooms` table definition (before `participants`):

```typescript
  userProfiles: defineTable({
    userId: v.string(),
    allergies: v.array(v.string()),
    dietFilters: v.array(v.string()),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
```

- [ ] **Step 2: Create userProfiles.ts with queries and mutations**

Create `convex/userProfiles.ts`:

```typescript
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get the current user's dietary profile
export const getMyProfile = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();
  },
});

// Update the current user's dietary profile (upsert)
export const updateMyProfile = mutation({
  args: {
    allergies: v.array(v.string()),
    dietFilters: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        allergies: args.allergies,
        dietFilters: args.dietFilters,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("userProfiles", {
        userId: identity.subject,
        allergies: args.allergies,
        dietFilters: args.dietFilters,
        updatedAt: Date.now(),
      });
    }
  },
});

// Get merged dietary profiles for all participants in a room
export const getProfilesForRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const mergedAllergies = new Set<string>();
    const mergedDietFilters = new Set<string>();

    for (const participant of participants) {
      const profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", participant.userId))
        .first();

      if (profile) {
        for (const allergy of profile.allergies) {
          mergedAllergies.add(allergy);
        }
        for (const diet of profile.dietFilters) {
          mergedDietFilters.add(diet);
        }
      }
    }

    return {
      allergies: Array.from(mergedAllergies),
      dietFilters: Array.from(mergedDietFilters),
    };
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts convex/userProfiles.ts
git commit -m "feat: add userProfiles table with queries and mutations"
```

---

### Task 3: Create DietaryProfileModal component

**Files:**
- Create: `src/components/DietaryProfileModal.tsx`

- [ ] **Step 1: Create the modal component**

Create `src/components/DietaryProfileModal.tsx`:

```tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { ALLERGY_OPTIONS, DIET_OPTIONS } from "./constants";

interface DietaryProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DietaryProfileModal({ isOpen, onClose }: DietaryProfileModalProps) {
  const profile = useQuery(api.userProfiles.getMyProfile);
  const updateProfile = useMutation(api.userProfiles.updateMyProfile);

  const [allergies, setAllergies] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState("");
  const [dietFilters, setDietFilters] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setAllergies(profile.allergies || []);
      setDietFilters(profile.dietFilters || []);
    }
  }, [profile]);

  const toggleItem = (list: string[], setList: (val: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const addCustomAllergy = () => {
    const val = customAllergy.trim().toLowerCase();
    if (val && !allergies.includes(val)) {
      setAllergies([...allergies, val]);
    }
    setCustomAllergy("");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({ allergies, dietFilters });
      onClose();
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const customAllergies = allergies.filter(
    (a) => !ALLERGY_OPTIONS.map((o) => o.toLowerCase()).includes(a)
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">My Dietary Profile</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>

          <div className="space-y-4">
            {/* Allergies */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Allergies</label>
              <div className="flex flex-wrap gap-2">
                {ALLERGY_OPTIONS.map((option) => {
                  const isSelected = allergies.includes(option.toLowerCase());
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleItem(allergies, setAllergies, option.toLowerCase())}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                        isSelected
                          ? "bg-primary-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom allergy input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customAllergy}
                onChange={(e) => setCustomAllergy(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomAllergy();
                  }
                }}
                placeholder="Add custom allergy..."
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
              <button
                type="button"
                onClick={addCustomAllergy}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition"
              >
                Add
              </button>
            </div>

            {/* Custom allergy chips */}
            {customAllergies.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {customAllergies.map((allergy) => (
                  <span
                    key={allergy}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-primary-600 text-white"
                  >
                    {allergy}
                    <button
                      type="button"
                      onClick={() => setAllergies(allergies.filter((a) => a !== allergy))}
                      className="ml-0.5 hover:text-primary-200"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Dietary restrictions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dietary Restrictions</label>
              <div className="flex flex-wrap gap-2">
                {DIET_OPTIONS.map((option) => {
                  const isSelected = dietFilters.includes(option.toLowerCase());
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleItem(dietFilters, setDietFilters, option.toLowerCase())}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                        isSelected
                          ? "bg-primary-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`w-full px-4 py-2 rounded-lg font-semibold transition text-sm ${
                isSaving
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-primary-600 text-white hover:bg-primary-700"
              }`}
            >
              {isSaving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/DietaryProfileModal.tsx
git commit -m "feat: add DietaryProfileModal component"
```

---

### Task 4: Create DietaryProfileButton navbar component

**Files:**
- Create: `src/components/DietaryProfileButton.tsx`
- Modify: `src/layouts/Layout.astro`

- [ ] **Step 1: Create the button component**

Create `src/components/DietaryProfileButton.tsx`:

```tsx
import { useState } from "react";
import ConvexClientProvider from "./ConvexClientProvider";
import DietaryProfileModal from "./DietaryProfileModal";

function DietaryProfileButtonInner() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-gray-600 hover:text-gray-900 transition"
        title="My Dietary Profile"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      </button>
      <DietaryProfileModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

export default function DietaryProfileButton() {
  return (
    <ConvexClientProvider>
      <DietaryProfileButtonInner />
    </ConvexClientProvider>
  );
}
```

- [ ] **Step 2: Add the button to Layout.astro**

In `src/layouts/Layout.astro`, add the import at the top of the frontmatter:

```astro
import DietaryProfileButton from '../components/DietaryProfileButton';
```

Then inside the `<SignedIn>` block, add the button before `<UserButton />`:

```astro
            <SignedIn>
              <DietaryProfileButton client:only="react" />
              <UserButton />
            </SignedIn>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/DietaryProfileButton.tsx src/layouts/Layout.astro
git commit -m "feat: add dietary profile button to navbar"
```

---

### Task 5: Refactor ConstraintsForm with merged profiles + room overrides

**Files:**
- Modify: `src/components/ConstraintsForm.tsx`

- [ ] **Step 1: Replace the entire file**

Replace `src/components/ConstraintsForm.tsx` with:

```tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { ALLERGY_OPTIONS, DIET_OPTIONS, COOKING_METHOD_OPTIONS, CUISINE_OPTIONS } from "./constants";

interface ConstraintsFormProps {
  roomId: Id<"rooms">;
}

function ToggleChips({
  label,
  options,
  selected,
  locked,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  locked?: string[];
  onToggle: (option: string) => void;
}) {
  const lockedSet = new Set(locked || []);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const key = option.toLowerCase();
          const isLocked = lockedSet.has(key);
          const isSelected = selected.includes(key) || isLocked;
          return (
            <button
              key={option}
              type="button"
              onClick={() => !isLocked && onToggle(key)}
              disabled={isLocked}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                isLocked
                  ? "bg-primary-800 text-white cursor-not-allowed opacity-75"
                  : isSelected
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              title={isLocked ? "Set by a participant's dietary profile" : undefined}
            >
              {option}{isLocked ? " (locked)" : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ConstraintsForm({ roomId }: ConstraintsFormProps) {
  const constraints = useQuery(api.constraints.getConstraints, { roomId });
  const mergedProfiles = useQuery(api.userProfiles.getProfilesForRoom, { roomId });
  const updateConstraints = useMutation(api.constraints.updateConstraints);

  const [roomAllergies, setRoomAllergies] = useState<string[]>([]);
  const [roomDietFilters, setRoomDietFilters] = useState<string[]>([]);
  const [cookingMethods, setCookingMethods] = useState<string[]>([]);
  const [cuisinePreferences, setCuisinePreferences] = useState<string[]>([]);
  const [mealType, setMealType] = useState("");
  const [timeLimitMins, setTimeLimitMins] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string>("");

  // User-profile constraints (locked)
  const profileAllergies = mergedProfiles?.allergies || [];
  const profileDietFilters = mergedProfiles?.dietFilters || [];

  useEffect(() => {
    if (constraints) {
      // Room-level overrides are what's stored minus what comes from profiles
      setRoomAllergies(constraints.allergies || []);
      setRoomDietFilters(constraints.dietFilters || []);
      setCookingMethods(constraints.cookingMethods || []);
      setCuisinePreferences(constraints.cuisinePreferences || []);
      setMealType(constraints.mealType || "");
      setTimeLimitMins(
        constraints.timeLimitMins !== undefined && constraints.timeLimitMins !== null
          ? String(constraints.timeLimitMins)
          : ""
      );
    }
  }, [constraints]);

  const toggleItem = (
    list: string[],
    setList: (val: string[]) => void,
    item: string
  ) => {
    // Don't allow toggling off items that come from user profiles
    if (profileAllergies.includes(item) || profileDietFilters.includes(item)) return;
    setList(
      list.includes(item) ? list.filter((i) => i !== item) : [...list, item]
    );
  };

  const handleUpdate = async () => {
    setError("");
    setIsUpdating(true);

    try {
      const timeVal = timeLimitMins ? parseInt(timeLimitMins, 10) : undefined;

      await updateConstraints({
        roomId,
        allergies: roomAllergies,
        dietFilters: roomDietFilters,
        cookingMethods,
        cuisinePreferences,
        mealType: mealType || undefined,
        timeLimitMins: timeVal,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update constraints";
      setError(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  // Combined view: profile items + room overrides (deduplicated)
  const allAllergies = Array.from(new Set([...profileAllergies, ...roomAllergies]));
  const allDietFilters = Array.from(new Set([...profileDietFilters, ...roomDietFilters]));

  // Show locked custom allergies from profiles that aren't in the preset list
  const lockedCustomAllergies = profileAllergies.filter(
    (a) => !ALLERGY_OPTIONS.map((o) => o.toLowerCase()).includes(a)
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-bold text-gray-900 mb-4">⚙️ Constraints</h3>

      <div className="space-y-4">
        <ToggleChips
          label="Allergies"
          options={ALLERGY_OPTIONS}
          selected={allAllergies}
          locked={profileAllergies}
          onToggle={(item) => toggleItem(roomAllergies, setRoomAllergies, item)}
        />

        {/* Show locked custom allergies from user profiles */}
        {lockedCustomAllergies.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {lockedCustomAllergies.map((allergy) => (
              <span
                key={allergy}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-primary-800 text-white opacity-75"
                title="Set by a participant's dietary profile"
              >
                {allergy} (locked)
              </span>
            ))}
          </div>
        )}

        <ToggleChips
          label="Dietary Restrictions"
          options={DIET_OPTIONS}
          selected={allDietFilters}
          locked={profileDietFilters}
          onToggle={(item) => toggleItem(roomDietFilters, setRoomDietFilters, item)}
        />

        <ToggleChips
          label="Cooking Methods"
          options={COOKING_METHOD_OPTIONS}
          selected={cookingMethods}
          onToggle={(item) => toggleItem(cookingMethods, setCookingMethods, item)}
        />

        <ToggleChips
          label="Cuisine Preferences"
          options={CUISINE_OPTIONS}
          selected={cuisinePreferences}
          onToggle={(item) => toggleItem(cuisinePreferences, setCuisinePreferences, item)}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meal Type
          </label>
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Any</option>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="snack">Snack</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time Limit (mins)
          </label>
          <input
            type="number"
            value={timeLimitMins}
            onChange={(e) => setTimeLimitMins(e.target.value)}
            placeholder="e.g., 30"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleUpdate}
          disabled={isUpdating}
          className={`w-full px-4 py-2 rounded-lg font-semibold transition text-sm ${
            isUpdating
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gray-600 text-white hover:bg-gray-700"
          }`}
        >
          {isUpdating ? "Updating..." : "Update Constraints"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ConstraintsForm.tsx
git commit -m "feat: show merged user profiles as locked chips in constraints form"
```

---

### Task 6: Update recipe generation to merge user profiles with room constraints

**Files:**
- Modify: `convex/recipeGeneration.ts`

- [ ] **Step 1: Update the generation action**

In `convex/recipeGeneration.ts`, after the participant check and before `// Update room status to generating`, add the profile merge logic. Replace lines from `const constraints = room.constraints || {};` through `const userPrompt = buildUserPrompt(...)`:

Find this block (around line 64-69):

```typescript
      const constraints = room.constraints || {};
      const systemPrompt = buildSystemPrompt();
      const userPrompt = buildUserPrompt(availableIngredients, mandatoryIngredients, constraints, count);
```

Replace with:

```typescript
      const roomConstraints = room.constraints || {};

      // Merge user profiles with room constraints
      const mergedProfiles = await ctx.runQuery(api.userProfiles.getProfilesForRoom, { roomId: args.roomId });
      const combinedAllergies = Array.from(new Set([
        ...(mergedProfiles?.allergies || []),
        ...(roomConstraints.allergies || []),
      ]));
      const combinedDietFilters = Array.from(new Set([
        ...(mergedProfiles?.dietFilters || []),
        ...(roomConstraints.dietFilters || []),
      ]));

      const constraints = {
        ...roomConstraints,
        allergies: combinedAllergies,
        dietFilters: combinedDietFilters,
      };

      const systemPrompt = buildSystemPrompt();
      const userPrompt = buildUserPrompt(availableIngredients, mandatoryIngredients, constraints, count);
```

- [ ] **Step 2: Commit**

```bash
git add convex/recipeGeneration.ts
git commit -m "feat: merge user dietary profiles into recipe generation constraints"
```

---

### Task 7: Final verification

- [ ] **Step 1: Verify Convex codegen**

Run: `npx convex codegen`
Expected: No errors.

- [ ] **Step 2: Verify build**

Run: `npx astro check && npx astro build`
Expected: Clean build.

- [ ] **Step 3: Commit any fixes if needed**
