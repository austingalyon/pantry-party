import { useAction, useQuery, useMutation } from "convex/react";
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

  const handleGenerate = async () => {
    setError("");
    
    // Check if there are ingredients
    if (!ingredients || ingredients.length === 0) {
      setError("Please add some ingredients first!");
      return;
    }
    
    setIsGenerating(true);
    
    console.log("🚀 Starting recipe generation for roomId:", roomId);
    console.log("📝 Ingredients:", ingredients.length);
    
    try {
      const result = await generateRecipes({ roomId, count: 10 });
      console.log("✅ Recipe generation completed:", result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate recipes";
      setError(errorMessage);
      console.error("❌ Recipe generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVote = async (recipeId: string) => {
    try {
      console.log("🗳️ Voting for recipe:", recipeId);
      await voteRecipe({ 
        roomId, 
        recipeId: recipeId as Id<"recipes">
      });
      console.log("✅ Vote recorded");
    } catch (err) {
      console.error("❌ Vote failed:", err);
    }
  };

  const canGenerate = (room?.status === "draft" || room?.status === "voting") && !isGenerating;

  // Build vote counts map and user votes set
  const voteCounts: Record<string, number> = roomVotes?.voteCounts || {};
  const userVotes = new Set<string>(
    (roomVotes?.votes || []).map((v: any) => v.recipeId)
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">🍳 Generated Recipes</h2>
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
                <RecipeCard
                  key={recipe._id}
                  recipe={{ ...recipe, voteCount }}
                  roomId={roomId}
                  onVote={handleVote}
                  userHasVoted={userHasVoted}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
