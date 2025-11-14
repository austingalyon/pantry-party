import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useEffect } from "react";

interface RoomDataProps {
  roomId: Id<"rooms">;
}

export default function RoomData({ roomId }: RoomDataProps) {
  useEffect(() => {
    console.log("RoomData mounted with roomId:", roomId);
  }, [roomId]);

  const room = useQuery(api.rooms.getRoom, { roomId });

  useEffect(() => {
    console.log("Room data:", room);
  }, [room]);

  if (!room) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Loading...</h1>
            <p className="text-sm text-gray-600 mt-1">Loading room data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{room.name}</h1>
          <p className="text-sm text-gray-600 mt-1">
            Created by <span className="font-semibold">{room.ownerName}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold ${
              room.status === "draft"
                ? "bg-gray-100 text-gray-800"
                : room.status === "generating"
                ? "bg-blue-100 text-blue-800"
                : room.status === "voting"
                ? "bg-green-100 text-green-800"
                : "bg-purple-100 text-purple-800"
            }`}
          >
            {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert("Room link copied to clipboard!");
          }}
          className="text-sm text-primary-600 hover:text-primary-700 font-semibold"
        >
          📋 Copy Room Link
        </button>
      </div>
    </div>
  );
}
