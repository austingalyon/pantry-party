import { useMutation } from "convex/react";
import { useEffect } from "react";
import RoomData from "./RoomData";
import IngredientList from "./IngredientList";
import RecipeGeneration from "./RecipeGeneration";
import ConstraintsForm from "./ConstraintsForm";
import ParticipantsList from "./ParticipantsList";
import ConvexClientProvider from "./ConvexClientProvider";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface RoomContentProps {
  roomId: Id<"rooms">;
}

function RoomContentInner({ roomId }: RoomContentProps) {
  const joinRoom = useMutation(api.rooms.joinRoom);

  // Auto-join room when component mounts
  useEffect(() => {
    const autoJoin = async () => {
      try {
        await joinRoom({ roomId });
      } catch (err) {
        // Non-fatal - user might already be a participant
      }
    };
    autoJoin();
  }, [roomId, joinRoom]);

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
        <ParticipantsList roomId={roomId} />

        {/* Constraints */}
        <ConstraintsForm roomId={roomId} />
      </div>
    </div>
  );
}

export default function RoomContent({ roomId }: RoomContentProps) {
  return (
    <ConvexClientProvider>
      <RoomContentInner roomId={roomId} />
    </ConvexClientProvider>
  );
}
