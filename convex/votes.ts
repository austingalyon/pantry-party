import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Cast a vote for a recipe
export const voteRecipe = mutation({
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

    if (room.status !== "voting") {
      throw new Error("Room is not in voting status");
    }

    const recipe = await ctx.db.get(args.recipeId);
    if (!recipe || recipe.roomId !== args.roomId) {
      throw new Error("Recipe not found in this room");
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

    // Check if already voted for this recipe
    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_user_recipe", (q) =>
        q.eq("userId", identity.subject).eq("recipeId", args.recipeId)
      )
      .first();

    if (existingVote) {
      // Toggle vote off
      await ctx.db.delete(existingVote._id);
      return { action: "removed" };
    } else {
      // Cast new vote
      await ctx.db.insert("votes", {
        roomId: args.roomId,
        recipeId: args.recipeId,
        userId: identity.subject,
        userName: participant.userName,
        votedAt: Date.now(),
      });
      return { action: "added" };
    }
  },
});

// Get votes for a specific recipe
export const getRecipeVotes = query({
  args: { recipeId: v.id("recipes") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("votes")
      .withIndex("by_recipe", (q) => q.eq("recipeId", args.recipeId))
      .collect();
  },
});

// Get all votes for a room with counts
export const getRoomVotes = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    // Group by recipeId and count
    const voteCounts: Record<string, number> = {};
    votes.forEach((vote) => {
      const recipeId = vote.recipeId;
      voteCounts[recipeId] = (voteCounts[recipeId] || 0) + 1;
    });

    return { votes, voteCounts };
  },
});

// Get leaderboard of recipes by votes
export const getRecipeLeaderboard = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const recipes = await ctx.db
      .query("recipes")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const votesData = await ctx.db
      .query("votes")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    // Count votes per recipe
    const voteCounts: Record<string, number> = {};
    votesData.forEach((vote) => {
      voteCounts[vote.recipeId] = (voteCounts[vote.recipeId] || 0) + 1;
    });

    // Add vote count to each recipe and sort
    const recipesWithVotes = recipes.map((recipe) => ({
      ...recipe,
      voteCount: voteCounts[recipe._id] || 0,
    }));

    recipesWithVotes.sort((a, b) => b.voteCount - a.voteCount);

    return recipesWithVotes;
  },
});
