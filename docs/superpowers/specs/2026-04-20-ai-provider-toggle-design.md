# AI Provider Toggle Design

**Date:** 2026-04-20
**Status:** Approved

## Goal

Add Claude (Anthropic) as an alternative AI provider for recipe generation, with a per-room toggle so participants can choose between GPT and Claude.

## Changes

### 1. Schema

Add `aiProvider` field to the `rooms` table:

```typescript
aiProvider: v.optional(v.union(v.literal("openai"), v.literal("claude")))
```

Optional so existing rooms don't need a migration. Treat missing/undefined as `"openai"` (backwards compatible).

### 2. New dependency

Add `@anthropic-ai/sdk` to the project dependencies.

### 3. Convex env var

Add `ANTHROPIC_API_KEY` to the Convex environment. Document in `convex/.env.example`.

### 4. Room mutation

Add `updateAiProvider` mutation to `convex/rooms.ts`:
- Args: `roomId`, `aiProvider` (union of `"openai"` | `"claude"`)
- Auth check + participant check (same pattern as other mutations)
- Patches the room record

### 5. Recipe generation

Refactor `convex/recipeGeneration.ts`:
- Read `room.aiProvider` (default to `"openai"` if not set)
- Shared code: prompt building, recipe validation, saving to DB — unchanged
- **OpenAI path**: Existing OpenAI SDK call, model changed from `gpt-4o-mini` to `gpt-4o`
- **Claude path**: Anthropic SDK, model `claude-sonnet-4-6`. Same system/user prompts. No `response_format` — JSON output is already instructed in the prompt. Parse the text response as JSON.
- `aiMetadata` stored on recipes reflects which provider/model was used

### 6. Frontend toggle

A two-option segmented control in the `RecipeGeneration` component near the Generate button:
- Labels: "GPT" / "Claude"
- Reflects current `room.aiProvider` value (real-time via Convex reactive query)
- Calls `updateAiProvider` mutation on click
- Disabled while room status is `"generating"`

## Files affected

| File | Change |
|------|--------|
| `convex/schema.ts` | Add `aiProvider` field to rooms table |
| `convex/rooms.ts` | Add `updateAiProvider` mutation |
| `convex/recipeGeneration.ts` | Branch API call by provider, update OpenAI model to `gpt-4o` |
| `src/components/RecipeGeneration.tsx` | Add provider toggle UI |
| `convex/.env.example` | Add `ANTHROPIC_API_KEY` |
| `package.json` | Add `@anthropic-ai/sdk` dependency |

## Out of scope

- Provider-specific prompt tuning (same prompts for both)
- Cost tracking or rate limiting per provider
- More than two providers
