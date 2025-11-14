import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new room
export const createRoom = mutation({
  args: {
    ownerName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const roomId = await ctx.db.insert("rooms", {
      ownerId: identity.subject,
      ownerName: args.ownerName,
      status: "draft",
      createdAt: Date.now(),
    });

    // Add owner as first participant
    await ctx.db.insert("participants", {
      roomId,
      userId: identity.subject,
      userName: args.ownerName,
      joinedAt: Date.now(),
    });

    // Initialize empty constraints
    await ctx.db.insert("constraints", {
      roomId,
      allergies: [],
      dietFilters: [],
      cookingMethods: [],
      cuisinePreferences: [],
      updatedAt: Date.now(),
    });

    return roomId;
  },
});

// Join an existing room
export const joinRoom = mutation({
  args: {
    roomId: v.id("rooms"),
    userName: v.string(),
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

    // Check if already a participant
    const existing = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    if (!existing) {
      await ctx.db.insert("participants", {
        roomId: args.roomId,
        userId: identity.subject,
        userName: args.userName,
        joinedAt: Date.now(),
      });
    }

    return args.roomId;
  },
});

// Get room details
export const getRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      return null;
    }

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const ingredients = await ctx.db
      .query("ingredients")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const constraints = await ctx.db
      .query("constraints")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .first();

    const recipes = await ctx.db
      .query("recipes")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    return {
      ...room,
      participants,
      ingredients,
      constraints,
      recipes,
    };
  },
});

// List all participants in a room
export const getParticipants = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
  },
});
