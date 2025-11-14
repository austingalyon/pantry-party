import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Add an ingredient to a room
export const addIngredient = mutation({
  args: {
    roomId: v.id("rooms"),
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
  },
  handler: async (ctx, args) => {
    // TODO: Re-enable auth when ready
    const tempUserId = "temp-user-" + Date.now();
    const tempUserName = "Guest";

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
      userId: tempUserId,
      userName: tempUserName,
      name: normalizedName,
      amount: args.amount,
      unit: args.unit,
      rawText: args.rawText,
      detectedFrom: args.detectedFrom,
      confidence: args.confidence,
      addedAt: Date.now(),
    });
  },
});

// Remove an ingredient
export const removeIngredient = mutation({
  args: {
    ingredientId: v.id("ingredients"),
  },
  handler: async (ctx, args) => {
    // TODO: Re-enable auth when ready
    const ingredient = await ctx.db.get(args.ingredientId);
    if (!ingredient) {
      throw new Error("Ingredient not found");
    }

    const room = await ctx.db.get(ingredient.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    // For now, allow anyone to remove
    await ctx.db.delete(args.ingredientId);
  },
});

// Get all ingredients for a room
export const getIngredients = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ingredients")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
  },
});

// Batch add ingredients (e.g., from speech or image)
export const addIngredientsBatch = mutation({
  args: {
    roomId: v.id("rooms"),
    ingredients: v.array(
      v.object({
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
      })
    ),
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

    const participant = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    if (!participant) {
      throw new Error("Not a participant in this room");
    }

    const ids = [];
    for (const ingredient of args.ingredients) {
      const normalizedName = ingredient.name.toLowerCase().trim();

      // Check for duplicates
      const existing = await ctx.db
        .query("ingredients")
        .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
        .filter((q) => q.eq(q.field("name"), normalizedName))
        .first();

      if (!existing) {
        const id = await ctx.db.insert("ingredients", {
          roomId: args.roomId,
          userId: identity.subject,
          userName: participant.userName,
          name: normalizedName,
          amount: ingredient.amount,
          unit: ingredient.unit,
          rawText: ingredient.rawText,
          detectedFrom: ingredient.detectedFrom,
          confidence: ingredient.confidence,
          addedAt: Date.now(),
        });
        ids.push(id);
      }
    }

    return ids;
  },
});
