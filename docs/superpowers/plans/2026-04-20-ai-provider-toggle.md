# AI Provider Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Claude as an alternative AI provider for recipe generation with a per-room toggle.

**Architecture:** Store `aiProvider` on the room record. The generation action reads it and branches to either the OpenAI or Anthropic SDK. A segmented control in the recipe UI lets participants switch providers.

**Tech Stack:** Anthropic SDK (`@anthropic-ai/sdk`), OpenAI SDK (existing), Convex, React

---

### Task 1: Add Anthropic SDK dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the Anthropic SDK**

Run:
```bash
npm install @anthropic-ai/sdk
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add @anthropic-ai/sdk dependency"
```

---

### Task 2: Add aiProvider field to schema and env var

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/.env.example`

- [ ] **Step 1: Add aiProvider to rooms table in schema**

In `convex/schema.ts`, add the `aiProvider` field to the `rooms` table definition, after the `selectedRecipeId` field:

```typescript
    selectedRecipeId: v.optional(v.id("recipes")),
    aiProvider: v.optional(v.union(v.literal("openai"), v.literal("claude"))),
```

- [ ] **Step 2: Add ANTHROPIC_API_KEY to convex/.env.example**

Append to `convex/.env.example`:

```
# Anthropic API key for Claude recipe generation
ANTHROPIC_API_KEY=sk-ant-...
```

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts convex/.env.example
git commit -m "feat: add aiProvider field to rooms schema"
```

---

### Task 3: Add updateAiProvider mutation

**Files:**
- Modify: `convex/rooms.ts`

- [ ] **Step 1: Add the mutation**

Add the following mutation at the end of `convex/rooms.ts`, before the closing of the file:

```typescript
// Update AI provider for a room
export const updateAiProvider = mutation({
  args: {
    roomId: v.id("rooms"),
    aiProvider: v.union(v.literal("openai"), v.literal("claude")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    // Verify user is a participant
    const participant = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    if (!participant) {
      throw new Error("Not a participant in this room");
    }

    await ctx.db.patch(args.roomId, { aiProvider: args.aiProvider });
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add convex/rooms.ts
git commit -m "feat: add updateAiProvider mutation"
```

---

### Task 4: Refactor recipeGeneration to support both providers

**Files:**
- Modify: `convex/recipeGeneration.ts`

- [ ] **Step 1: Replace the entire file**

Replace `convex/recipeGeneration.ts` with the following. Key changes:
- Import Anthropic SDK alongside OpenAI
- Read `room.aiProvider` (default `"openai"`)
- Branch API call: `callOpenAI()` vs `callClaude()`
- OpenAI model changed from `gpt-4o-mini` to `gpt-4o`
- `aiMetadata` records which provider/model was used
- Shared code (prompts, validation, saving) unchanged

```typescript
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Recipe generation action
export const generateRecipes = action({
  args: {
    roomId: v.id("rooms"),
    count: v.optional(v.number()),
  },
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

    // Update room status to generating
    await ctx.runMutation(api.recipes.updateRoomStatus, {
      roomId: args.roomId,
      status: "generating",
    });

    try {
      // Check if we have ingredients
      if (!room.ingredients || room.ingredients.length === 0) {
        throw new Error("No ingredients found. Please add ingredients before generating recipes.");
      }

      // Build the prompt
      const ingredientList = room.ingredients
        .map((ing: any) => {
          if (ing.amount && ing.unit) {
            return `${ing.amount} ${ing.unit} ${ing.name}`;
          }
          return ing.name;
        })
        .join(", ");

      const constraints = room.constraints || {};
      const systemPrompt = buildSystemPrompt();
      const userPrompt = buildUserPrompt(ingredientList, constraints, count);

      // Call the selected AI provider
      const aiProvider = (room as any).aiProvider || "openai";
      let responseText: string;
      let aiMetadata: Record<string, any>;

      if (aiProvider === "claude") {
        const result = await callClaude(systemPrompt, userPrompt);
        responseText = result.text;
        aiMetadata = result.metadata;
      } else {
        const result = await callOpenAI(systemPrompt, userPrompt);
        responseText = result.text;
        aiMetadata = result.metadata;
      }

      const parsed = JSON.parse(responseText);
      const recipes = parsed.recipes || [];

      // Validate and filter recipes
      const validRecipes = recipes
        .filter((recipe: any) => validateRecipe(recipe, constraints))
        .slice(0, count);

      if (validRecipes.length === 0) {
        throw new Error("No valid recipes generated");
      }

      // Save recipes to database
      const recipeIds: string[] = [];

      for (const recipe of validRecipes) {
        const id = await ctx.runMutation(api.recipes.createRecipe, {
          roomId: args.roomId,
          title: recipe.title,
          description: recipe.description,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          tags: recipe.tags || [],
          estimatedTimeMinutes: recipe.estimatedTimeMinutes || 30,
          servings: recipe.servings || 4,
          sensitivityFlags: recipe.sensitivityFlags || [],
          aiMetadata,
        });
        recipeIds.push(id);
      }

      // Update room status to voting
      await ctx.runMutation(api.recipes.updateRoomStatus, {
        roomId: args.roomId,
        status: "voting",
      });

      return { recipeIds, count: recipeIds.length };
    } catch (error) {
      console.error("Recipe generation failed:", error);

      // Revert status on error
      await ctx.runMutation(api.recipes.updateRoomStatus, {
        roomId: args.roomId,
        status: "draft",
      });
      throw error;
    }
  },
});

// Call OpenAI API
async function callOpenAI(
  systemPrompt: string,
  userPrompt: string
): Promise<{ text: string; metadata: Record<string, any> }> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.8,
  });

  const text = completion.choices[0].message.content;
  if (!text) {
    throw new Error("Empty response from OpenAI");
  }

  return {
    text,
    metadata: {
      provider: "openai",
      model: completion.model,
      promptTokens: completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
    },
  };
}

// Call Anthropic Claude API
async function callClaude(
  systemPrompt: string,
  userPrompt: string
): Promise<{ text: string; metadata: Record<string, any> }> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      { role: "user", content: userPrompt },
    ],
    temperature: 0.8,
  });

  const textBlock = message.content.find((block: any) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Empty response from Claude");
  }

  return {
    text: textBlock.text,
    metadata: {
      provider: "anthropic",
      model: message.model,
      promptTokens: message.usage?.input_tokens,
      completionTokens: message.usage?.output_tokens,
    },
  };
}

// Helper: Build system prompt
function buildSystemPrompt(): string {
  return `You are KitchenCopilot, a precise recipe generator. Given a list of ingredients and constraints, generate creative, realistic recipes that the group can cook together.

Output a JSON object with this exact structure:
{
  "recipes": [
    {
      "title": "Recipe Name",
      "description": "Brief 1-2 sentence description",
      "ingredients": [
        {
          "name": "ingredient name",
          "amount": "1 cup" (optional),
          "preparation": "diced" (optional)
        }
      ],
      "steps": ["Step 1", "Step 2", ...],
      "tags": ["quick", "vegetarian", "grilling"],
      "estimatedTimeMinutes": 30,
      "servings": 4,
      "sensitivityFlags": ["contains_nuts", "contains_dairy"]
    }
  ]
}

CRITICAL: Respect all dietary restrictions and allergies. Mark sensitivity flags accurately. Be conservative with substitutions.`;
}

// Helper: Build user prompt
function buildUserPrompt(
  ingredientList: string,
  constraints: any,
  count: number
): string {
  let prompt = `Generate ${count} diverse recipes using these ingredients:\n${ingredientList}\n\n`;

  if (constraints.allergies && constraints.allergies.length > 0) {
    prompt += `FORBIDDEN ALLERGENS (must exclude): ${constraints.allergies.join(", ")}\n`;
  }

  if (constraints.dietFilters && constraints.dietFilters.length > 0) {
    prompt += `Dietary filters: ${constraints.dietFilters.join(", ")}\n`;
  }

  if (constraints.mealType) {
    prompt += `Meal type: ${constraints.mealType}\n`;
  }

  if (constraints.cookingMethods && constraints.cookingMethods.length > 0) {
    prompt += `Preferred cooking methods: ${constraints.cookingMethods.join(", ")}\n`;
  }

  if (constraints.timeLimitMins) {
    prompt += `Time limit: ${constraints.timeLimitMins} minutes\n`;
  }

  if (constraints.cuisinePreferences && constraints.cuisinePreferences.length > 0) {
    prompt += `Cuisine preferences: ${constraints.cuisinePreferences.join(", ")}\n`;
  }

  prompt += `\nProvide diverse options with clear instructions. Output JSON only.`;

  return prompt;
}

// Helper: Validate recipe against constraints
function validateRecipe(recipe: any, constraints: any): boolean {
  if (!recipe.title || !recipe.steps || !Array.isArray(recipe.steps)) {
    return false;
  }

  // Check for forbidden allergens
  if (constraints.allergies && constraints.allergies.length > 0) {
    const forbiddenTerms = constraints.allergies.map((a: string) =>
      a.toLowerCase()
    );

    // Check recipe title, description, and ingredients
    const recipeText = `${recipe.title} ${recipe.description || ""} ${JSON.stringify(recipe.ingredients || [])}`.toLowerCase();

    for (const term of forbiddenTerms) {
      if (recipeText.includes(term)) {
        return false;
      }
    }
  }

  return true;
}
```

- [ ] **Step 2: Commit**

```bash
git add convex/recipeGeneration.ts
git commit -m "feat: support OpenAI and Claude providers in recipe generation"
```

---

### Task 5: Add provider toggle to RecipeGeneration UI

**Files:**
- Modify: `src/components/RecipeGeneration.tsx`

- [ ] **Step 1: Replace the entire file**

Replace `src/components/RecipeGeneration.tsx` with the following. Key changes:
- Add `updateAiProvider` mutation
- Read `room.aiProvider` from the reactive query (already have `room` from `getRoom`)
- Add a segmented toggle ("GPT" / "Claude") between the title and Generate button
- Disable toggle while generating

```tsx
import { Authenticated, useAction, useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import RecipeCard from "./RecipeCard";

interface RecipeGenerationProps {
  roomId: Id<"rooms">;
}

export default function RecipeGeneration({ roomId }: RecipeGenerationProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>("");

  const generateRecipes = useAction(api.recipeGeneration.generateRecipes);
  const recipes = useQuery(api.recipes.getRecipes, { roomId });
  const room = useQuery(api.rooms.getRoom, { roomId });
  const ingredients = useQuery(api.ingredients.getIngredients, { roomId });
  const roomVotes = useQuery(api.votes.getRoomVotes, { roomId });

  const voteRecipe = useMutation(api.votes.voteRecipe);
  const updateAiProvider = useMutation(api.rooms.updateAiProvider);

  const aiProvider = (room as any)?.aiProvider || "openai";

  const handleProviderChange = async (provider: "openai" | "claude") => {
    try {
      await updateAiProvider({ roomId, aiProvider: provider });
    } catch (err) {
      console.error("Failed to update AI provider:", err);
    }
  };

  const handleGenerate = async () => {
    setError("");

    if (!ingredients || ingredients.length === 0) {
      setError("Please add some ingredients first!");
      return;
    }

    setIsGenerating(true);

    try {
      await generateRecipes({ roomId, count: 10 });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate recipes";
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVote = async (recipeId: string) => {
    try {
      await voteRecipe({
        roomId,
        recipeId: recipeId as Id<"recipes">,
      });
    } catch (err) {
      console.error("Vote failed:", err);
    }
  };

  const canGenerate = (room?.status === "draft" || room?.status === "voting") && !isGenerating;
  const isGeneratingStatus = room?.status === "generating" || isGenerating;

  // Build vote counts map and user votes set
  const voteCounts: Record<string, number> = roomVotes?.voteCounts || {};
  const userVotes = new Set<string>(
    (roomVotes?.votes || []).map((v: any) => v.recipeId)
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">🍳 Generated Recipes</h2>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => handleProviderChange("openai")}
              disabled={isGeneratingStatus}
              className={`px-3 py-1.5 text-sm font-medium transition ${
                aiProvider === "openai"
                  ? "bg-primary-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              } ${isGeneratingStatus ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              GPT
            </button>
            <button
              onClick={() => handleProviderChange("claude")}
              disabled={isGeneratingStatus}
              className={`px-3 py-1.5 text-sm font-medium transition border-l border-gray-300 ${
                aiProvider === "claude"
                  ? "bg-primary-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              } ${isGeneratingStatus ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Claude
            </button>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !canGenerate}
            className={`px-6 py-2 rounded-lg font-semibold transition ${
              isGenerating || !canGenerate
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {isGenerating ? "Generating..." : "Generate Recipes"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {room?.status === "generating" && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm">
          🤖 AI is cooking up some recipes...
        </div>
      )}

      <div className="space-y-4">
        {!recipes || recipes.length === 0 ? (
          <p className="text-gray-500 italic">
            No recipes yet. Add ingredients and generate!
          </p>
        ) : (
          <div className="grid gap-4">
            {recipes.map((recipe) => {
              const voteCount = voteCounts[recipe._id] || 0;
              const userHasVoted = userVotes.has(recipe._id);

              return (
                <Authenticated>
                  <RecipeCard
                    key={recipe._id}
                    recipe={{ ...recipe, voteCount }}
                    roomId={roomId}
                    onVote={handleVote}
                    userHasVoted={userHasVoted}
                  />
                </Authenticated>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/RecipeGeneration.tsx
git commit -m "feat: add AI provider toggle to recipe generation UI"
```

---

### Task 6: Final verification

- [ ] **Step 1: Verify Convex codegen works**

Run: `npx convex codegen`
Expected: No errors.

- [ ] **Step 2: Verify build**

Run: `npx astro check && npx astro build`
Expected: Clean build.

- [ ] **Step 3: Commit any fixes if needed**
