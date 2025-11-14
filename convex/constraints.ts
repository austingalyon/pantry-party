import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Update constraints for a room
export const updateConstraints = mutation({
  args: {
    roomId: v.id("rooms"),
    allergies: v.optional(v.array(v.string())),
    dietFilters: v.optional(v.array(v.string())),
    mealType: v.optional(v.string()),
    cookingMethods: v.optional(v.array(v.string())),
    timeLimitMins: v.optional(v.number()),
    cuisinePreferences: v.optional(v.array(v.string())),
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

    const existing = await ctx.db
      .query("constraints")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .first();

    const updates: any = { updatedAt: Date.now() };
    if (args.allergies !== undefined) updates.allergies = args.allergies;
    if (args.dietFilters !== undefined) updates.dietFilters = args.dietFilters;
    if (args.mealType !== undefined) updates.mealType = args.mealType;
    if (args.cookingMethods !== undefined) updates.cookingMethods = args.cookingMethods;
    if (args.timeLimitMins !== undefined) updates.timeLimitMins = args.timeLimitMins;
    if (args.cuisinePreferences !== undefined) updates.cuisinePreferences = args.cuisinePreferences;

    if (existing) {
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    } else {
      return await ctx.db.insert("constraints", {
        roomId: args.roomId,
        allergies: args.allergies || [],
        dietFilters: args.dietFilters || [],
        mealType: args.mealType,
        cookingMethods: args.cookingMethods || [],
        timeLimitMins: args.timeLimitMins,
        cuisinePreferences: args.cuisinePreferences || [],
        updatedAt: Date.now(),
      });
    }
  },
});

// Get constraints for a room
export const getConstraints = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("constraints")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .first();
  },
});
