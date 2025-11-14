import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new room
export const createRoom = mutation({
  args: {
    name: v.string(),
    ownerName: v.string(),
  },
  handler: async (ctx, args) => {
    // TODO: Re-enable auth when ready
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity) {
    //   throw new Error("Not authenticated");
    // }
    
    // For now, use a temporary ID
    const tempUserId = "temp-user-" + Date.now();

    const roomId = await ctx.db.insert("rooms", {
      name: args.name,
      ownerId: tempUserId,
      ownerName: args.ownerName,
      status: "draft",
      createdAt: Date.now(),
    });

    // Add owner as first participant
    await ctx.db.insert("participants", {
      roomId,
      userId: tempUserId,
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
    // TODO: Re-enable auth when ready
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity) {
    //   throw new Error("Not authenticated");
    // }
    
    const tempUserId = "temp-user-" + Date.now();

    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    // Check if already a participant
    const existing = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("userId"), tempUserId))
      .first();

    if (!existing) {
      await ctx.db.insert("participants", {
        roomId: args.roomId,
        userId: tempUserId,
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
