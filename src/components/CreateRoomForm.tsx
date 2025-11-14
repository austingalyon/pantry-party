import { ConvexProvider, ConvexReactClient, useMutation } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";

function CreateRoomFormInner() {
  const [roomName, setRoomName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRoom = useMutation(api.rooms.createRoom);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsCreating(true);

    try {
      console.log("Creating room:", { name: roomName, ownerName });
      const roomId = await createRoom({
        name: roomName,
        ownerName: ownerName,
      });
      console.log("Room created:", roomId);
      setCreatedRoomId(roomId);
    } catch (err) {
      console.error("Failed to create room:", err);
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setIsCreating(false);
    }
  };

  const roomUrl = createdRoomId
    ? `${window.location.origin}/room/${createdRoomId}`
    : "";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(roomUrl);
    alert("Room link copied to clipboard!");
  };

  if (createdRoomId) {
    return (
      <div className="mt-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800 mb-2 font-semibold">
            ✅ Room created! Share this link:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={roomUrl}
              readOnly
              className="flex-1 px-4 py-2 bg-white border border-green-300 rounded-lg text-sm"
            />
            <button
              onClick={copyToClipboard}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              Copy
            </button>
          </div>
          <a
            href={`/room/${createdRoomId}`}
            className="inline-block mt-4 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition"
          >
            Enter Room →
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="room-name"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Room Name
        </label>
        <input
          type="text"
          id="room-name"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="e.g., Friday Dinner Party"
        />
      </div>

      <div>
        <label
          htmlFor="owner-name"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Your Name
        </label>
        <input
          type="text"
          id="owner-name"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="Enter your name"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isCreating}
        className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isCreating ? "Creating..." : "Create Room"}
      </button>
    </form>
  );
}

export default function CreateRoomForm() {
  const convex = useMemo(() => {
    let url = import.meta.env.PUBLIC_CONVEX_URL;
    if (!url && typeof window !== "undefined") {
      url = (window as any).CONVEX_URL || "http://127.0.0.1:3210";
    }
    if (!url) {
      url = "http://127.0.0.1:3210";
    }
    console.log("CreateRoomForm - Convex URL:", url);
    return new ConvexReactClient(url);
  }, []);

  return (
    <ConvexProvider client={convex}>
      <CreateRoomFormInner />
    </ConvexProvider>
  );
}
