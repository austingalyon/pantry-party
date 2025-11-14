import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  rooms: defineTable({
    ownerId: v.string(),
    ownerName: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("generating"),
      v.literal("voting"),
      v.literal("selected")
    ),
    createdAt: v.number(),
    selectedRecipeId: v.optional(v.id("recipes")),
  }),

  participants: defineTable({
    roomId: v.id("rooms"),
    userId: v.string(),
    userName: v.string(),
    joinedAt: v.number(),
  }).index("by_room", ["roomId"]),

  ingredients: defineTable({
    roomId: v.id("rooms"),
    userId: v.string(),
    userName: v.string(),
    name: v.string(),
    amount: v.optional(v.string()),
    unit: v.optional(v.string()),
    rawText: v.string(),
    detectedFrom: v.union(
      v.literal("text"),
      v.literal("speech"),
      v.literal("image")
    ),
    confidence: v.optional(v.number()),
    addedAt: v.number(),
  }).index("by_room", ["roomId"]),

  constraints: defineTable({
    roomId: v.id("rooms"),
    allergies: v.array(v.string()),
    dietFilters: v.array(v.string()),
    mealType: v.optional(v.string()),
    cookingMethods: v.array(v.string()),
    timeLimitMins: v.optional(v.number()),
    cuisinePreferences: v.array(v.string()),
    updatedAt: v.number(),
  }).index("by_room", ["roomId"]),

  recipes: defineTable({
    roomId: v.id("rooms"),
    title: v.string(),
    description: v.string(),
    ingredients: v.array(
      v.object({
        name: v.string(),
        amount: v.optional(v.string()),
        preparation: v.optional(v.string()),
      })
    ),
    steps: v.array(v.string()),
    tags: v.array(v.string()),
    estimatedTimeMinutes: v.number(),
    servings: v.number(),
    sensitivityFlags: v.array(v.string()),
    aiMetadata: v.optional(v.any()),
    generatedAt: v.number(),
  }).index("by_room", ["roomId"]),

  votes: defineTable({
    roomId: v.id("rooms"),
    recipeId: v.id("recipes"),
    userId: v.string(),
    userName: v.string(),
    votedAt: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_recipe", ["recipeId"])
    .index("by_user_recipe", ["userId", "recipeId"]),
});
