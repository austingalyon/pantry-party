import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useMemo } from "react";
import RoomData from "./RoomData";
import IngredientList from "./IngredientList";
import RecipeGeneration from "./RecipeGeneration";
import ConstraintsForm from "./ConstraintsForm";
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
        <RecipeGeneration roomId={roomId} />
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
        <ConstraintsForm roomId={roomId} />
      </div>
    </div>
  );
}

export default function RoomContent({ roomId }: RoomContentProps) {
  const convex = useMemo(() => {
    // Try multiple ways to get the URL
    let url = import.meta.env.PUBLIC_CONVEX_URL;
    console.log("RoomContent - Initial Convex URL from env:", url);
    
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
