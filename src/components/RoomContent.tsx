import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useMemo } from "react";
import RoomData from "./RoomData";
import IngredientList from "./IngredientList";
import type { Id } from "../../convex/_generated/dataModel";

interface RoomContentProps {
  roomId: Id<"rooms">;
}

function RoomContentInner({ roomId }: RoomContentProps) {
  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Room Header */}
        <RoomData roomId={roomId} />

        {/* Ingredients Section */}
        <IngredientList roomId={roomId} />

        {/* Recipes Section */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">🍳 Generated Recipes</h2>
            <button
              id="generate-recipes"
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition font-semibold"
            >
              Generate Recipes
            </button>
          </div>

          <div id="recipes-list" className="space-y-4">
            <p className="text-gray-500 italic">
              No recipes yet. Add ingredients and generate!
            </p>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Participants */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-gray-900 mb-4">👥 Participants</h3>
          <div id="participants-list" className="space-y-2">
            <div className="flex items-center gap-2 text-gray-700">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>Loading...</span>
            </div>
          </div>
        </div>

        {/* Constraints */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-gray-900 mb-4">⚙️ Constraints</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allergies
              </label>
              <input
                type="text"
                id="allergies-input"
                placeholder="e.g., nuts, dairy"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meal Type
              </label>
              <select
                id="meal-type-select"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Any</option>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Limit (mins)
              </label>
              <input
                type="number"
                id="time-limit-input"
                placeholder="e.g., 30"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <button
              id="update-constraints"
              className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition text-sm font-semibold"
            >
              Update Constraints
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RoomContent({ roomId }: RoomContentProps) {
  const convex = useMemo(() => {
    // Try multiple ways to get the URL
    let url = import.meta.env.PUBLIC_CONVEX_URL;
    
    // Fallback for production or if env var isn't available
    if (!url && typeof window !== 'undefined') {
      url = (window as any).CONVEX_URL || 'http://127.0.0.1:3210';
    }
    
    if (!url) {
      console.error("❌ PUBLIC_CONVEX_URL is not set! Using fallback.");
      url = 'http://127.0.0.1:3210';
    }
    
    console.log("✅ Convex initializing with URL:", url);
    const client = new ConvexReactClient(url);
    console.log("✅ Convex client created:", client);
    return client;
  }, []);

  console.log("🎯 RoomContent rendering with roomId:", roomId);

  return (
    <ConvexProvider client={convex}>
      <RoomContentInner roomId={roomId} />
    </ConvexProvider>
  );
}
