import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a recipe
export const createRecipe = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("recipes", {
      roomId: args.roomId,
      title: args.title,
      description: args.description,
      ingredients: args.ingredients,
      steps: args.steps,
      tags: args.tags,
      estimatedTimeMinutes: args.estimatedTimeMinutes,
      servings: args.servings,
      sensitivityFlags: args.sensitivityFlags,
      aiMetadata: args.aiMetadata,
      generatedAt: Date.now(),
    });
  },
});

// Update room status
export const updateRoomStatus = mutation({
  args: {
    roomId: v.id("rooms"),
    status: v.union(
      v.literal("draft"),
      v.literal("generating"),
      v.literal("voting"),
      v.literal("selected")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.roomId, { status: args.status });
  },
});

// Get all recipes for a room
export const getRecipes = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("recipes")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
  },
});

// Get a single recipe
export const getRecipe = query({
  args: { recipeId: v.id("recipes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.recipeId);
  },
});

// Select winning recipe
export const selectRecipe = mutation({
  args: {
    roomId: v.id("rooms"),
    recipeId: v.id("recipes"),
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

    // Only owner can select
    if (room.ownerId !== identity.subject) {
      throw new Error("Only the room owner can select a recipe");
    }

    const recipe = await ctx.db.get(args.recipeId);
    if (!recipe || recipe.roomId !== args.roomId) {
      throw new Error("Recipe not found in this room");
    }

    await ctx.db.patch(args.roomId, {
      status: "selected",
      selectedRecipeId: args.recipeId,
    });

    return args.recipeId;
  },
});
