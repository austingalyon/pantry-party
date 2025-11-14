import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";

interface IngredientListProps {
  roomId: Id<"rooms">;
}

export default function IngredientList({ roomId }: IngredientListProps) {
  const [ingredientInput, setIngredientInput] = useState("");
  const ingredients = useQuery(api.ingredients.getIngredients, { roomId });
  const addIngredient = useMutation(api.ingredients.addIngredient);
  const removeIngredient = useMutation(api.ingredients.removeIngredient);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredientInput.trim()) return;

    try {
      await addIngredient({
        roomId,
        name: ingredientInput.trim(),
        rawText: ingredientInput,
        detectedFrom: "text",
      });
      setIngredientInput("");
    } catch (error) {
      console.error("Failed to add ingredient:", error);
      alert("Failed to add ingredient. Please try again.");
    }
  };

  const handleRemove = async (ingredientId: Id<"ingredients">) => {
    try {
      await removeIngredient({ ingredientId });
    } catch (error) {
      console.error("Failed to remove ingredient:", error);
      alert("Failed to remove ingredient. Please try again.");
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">🥗 Ingredients</h2>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={ingredientInput}
            onChange={(e) => setIngredientInput(e.target.value)}
            placeholder="Add an ingredient..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition font-semibold"
          >
            Add
          </button>
        </div>
      </form>

      <div className="space-y-2">
        {!ingredients ? (
          <p className="text-gray-500 italic">Loading ingredients...</p>
        ) : ingredients.length === 0 ? (
          <p className="text-gray-500 italic">No ingredients yet. Add some!</p>
        ) : (
          ingredients.map((ingredient) => (
            <div
              key={ingredient._id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {ingredient.detectedFrom === "speech"
                    ? "🎤"
                    : ingredient.detectedFrom === "image"
                    ? "📸"
                    : "✍️"}
                </span>
                <div>
                  <p className="font-medium text-gray-900">
                    {ingredient.amount && ingredient.unit
                      ? `${ingredient.amount} ${ingredient.unit} `
                      : ""}
                    {ingredient.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    Added by {ingredient.userName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleRemove(ingredient._id)}
                className="text-red-500 hover:text-red-700 text-sm font-semibold"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
