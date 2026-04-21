import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { ALLERGY_OPTIONS, DIET_OPTIONS, COOKING_METHOD_OPTIONS, CUISINE_OPTIONS } from "./constants";

interface ConstraintsFormProps {
  roomId: Id<"rooms">;
}

function ToggleChips({
  label,
  options,
  selected,
  locked,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  locked?: string[];
  onToggle: (option: string) => void;
}) {
  const lockedSet = new Set(locked || []);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const key = option.toLowerCase();
          const isLocked = lockedSet.has(key);
          const isSelected = selected.includes(key) || isLocked;
          return (
            <button
              key={option}
              type="button"
              onClick={() => !isLocked && onToggle(key)}
              disabled={isLocked}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                isLocked
                  ? "bg-primary-800 text-white cursor-not-allowed opacity-75"
                  : isSelected
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              title={isLocked ? "Set by a participant's dietary profile" : undefined}
            >
              {option}{isLocked ? " (locked)" : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ConstraintsForm({ roomId }: ConstraintsFormProps) {
  const constraints = useQuery(api.constraints.getConstraints, { roomId });
  const mergedProfiles = useQuery(api.userProfiles.getProfilesForRoom, { roomId });
  const updateConstraints = useMutation(api.constraints.updateConstraints);

  const [roomAllergies, setRoomAllergies] = useState<string[]>([]);
  const [roomDietFilters, setRoomDietFilters] = useState<string[]>([]);
  const [cookingMethods, setCookingMethods] = useState<string[]>([]);
  const [cuisinePreferences, setCuisinePreferences] = useState<string[]>([]);
  const [mealType, setMealType] = useState("");
  const [timeLimitMins, setTimeLimitMins] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string>("");

  // User-profile constraints (locked)
  const profileAllergies = mergedProfiles?.allergies || [];
  const profileDietFilters = mergedProfiles?.dietFilters || [];

  useEffect(() => {
    if (constraints) {
      setRoomAllergies(constraints.allergies || []);
      setRoomDietFilters(constraints.dietFilters || []);
      setCookingMethods(constraints.cookingMethods || []);
      setCuisinePreferences(constraints.cuisinePreferences || []);
      setMealType(constraints.mealType || "");
      setTimeLimitMins(
        constraints.timeLimitMins !== undefined && constraints.timeLimitMins !== null
          ? String(constraints.timeLimitMins)
          : ""
      );
    }
  }, [constraints]);

  const toggleItem = (
    list: string[],
    setList: (val: string[]) => void,
    item: string
  ) => {
    if (profileAllergies.includes(item) || profileDietFilters.includes(item)) return;
    setList(
      list.includes(item) ? list.filter((i) => i !== item) : [...list, item]
    );
  };

  const handleUpdate = async () => {
    setError("");
    setIsUpdating(true);

    try {
      const timeVal = timeLimitMins ? parseInt(timeLimitMins, 10) : undefined;

      await updateConstraints({
        roomId,
        allergies: roomAllergies,
        dietFilters: roomDietFilters,
        cookingMethods,
        cuisinePreferences,
        mealType: mealType || undefined,
        timeLimitMins: timeVal,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update constraints";
      setError(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  // Combined view: profile items + room overrides (deduplicated)
  const allAllergies = Array.from(new Set([...profileAllergies, ...roomAllergies]));
  const allDietFilters = Array.from(new Set([...profileDietFilters, ...roomDietFilters]));

  // Show locked custom allergies from profiles that aren't in the preset list
  const lockedCustomAllergies = profileAllergies.filter(
    (a) => !ALLERGY_OPTIONS.map((o) => o.toLowerCase()).includes(a)
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-bold text-gray-900 mb-4">⚙️ Constraints</h3>

      <div className="space-y-4">
        <ToggleChips
          label="Allergies"
          options={ALLERGY_OPTIONS}
          selected={allAllergies}
          locked={profileAllergies}
          onToggle={(item) => toggleItem(roomAllergies, setRoomAllergies, item)}
        />

        {/* Show locked custom allergies from user profiles */}
        {lockedCustomAllergies.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {lockedCustomAllergies.map((allergy) => (
              <span
                key={allergy}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-primary-800 text-white opacity-75"
                title="Set by a participant's dietary profile"
              >
                {allergy} (locked)
              </span>
            ))}
          </div>
        )}

        <ToggleChips
          label="Dietary Restrictions"
          options={DIET_OPTIONS}
          selected={allDietFilters}
          locked={profileDietFilters}
          onToggle={(item) => toggleItem(roomDietFilters, setRoomDietFilters, item)}
        />

        <ToggleChips
          label="Cooking Methods"
          options={COOKING_METHOD_OPTIONS}
          selected={cookingMethods}
          onToggle={(item) => toggleItem(cookingMethods, setCookingMethods, item)}
        />

        <ToggleChips
          label="Cuisine Preferences"
          options={CUISINE_OPTIONS}
          selected={cuisinePreferences}
          onToggle={(item) => toggleItem(cuisinePreferences, setCuisinePreferences, item)}
        />

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
