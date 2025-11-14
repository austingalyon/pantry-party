import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useState, useEffect } from "react";

interface ConstraintsFormProps {
  roomId: Id<"rooms">;
}

export default function ConstraintsForm({ roomId }: ConstraintsFormProps) {
  const constraints = useQuery(api.constraints.getConstraints, { roomId });
  const updateConstraints = useMutation(api.constraints.updateConstraints);

  const [allergies, setAllergies] = useState("");
  const [mealType, setMealType] = useState("");
  const [timeLimitMins, setTimeLimitMins] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string>("");

  // Load existing constraints
  useEffect(() => {
    if (constraints) {
      setAllergies(constraints.allergies?.join(", ") || "");
      setMealType(constraints.mealType || "");
      setTimeLimitMins(
        constraints.timeLimitMins !== undefined && constraints.timeLimitMins !== null
          ? String(constraints.timeLimitMins)
          : ""
      );
    }
  }, [constraints]);

  const handleUpdate = async () => {
    setError("");
    setIsUpdating(true);

    console.log("🔧 Updating constraints for roomId:", roomId);

    try {
      const allergiesArray = allergies
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a.length > 0);

      const timeVal = timeLimitMins ? parseInt(timeLimitMins, 10) : undefined;

      await updateConstraints({
        roomId,
        allergies: allergiesArray.length > 0 ? allergiesArray : undefined,
        mealType: mealType || undefined,
        timeLimitMins: timeVal,
      });

      console.log("✅ Constraints updated successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update constraints";
      setError(errorMessage);
      console.error("❌ Constraints update error:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-bold text-gray-900 mb-4">⚙️ Constraints</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Allergies
          </label>
          <input
            type="text"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            placeholder="e.g., nuts, dairy"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meal Type
          </label>
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
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
            value={timeLimitMins}
            onChange={(e) => setTimeLimitMins(e.target.value)}
            placeholder="e.g., 30"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleUpdate}
          disabled={isUpdating}
          className={`w-full px-4 py-2 rounded-lg font-semibold transition text-sm ${
            isUpdating
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gray-600 text-white hover:bg-gray-700"
          }`}
        >
          {isUpdating ? "Updating..." : "Update Constraints"}
        </button>
      </div>
    </div>
  );
}
