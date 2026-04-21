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
