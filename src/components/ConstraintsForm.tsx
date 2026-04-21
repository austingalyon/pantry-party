import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { DIET_OPTIONS, ALLERGY_OPTIONS, COOKING_METHOD_OPTIONS, CUISINE_OPTIONS } from "./constants";

interface ConstraintsFormProps {
  roomId: Id<"rooms">;
}

function ToggleChips({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option.toLowerCase());
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option.toLowerCase())}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                isSelected
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ConstraintsForm({ roomId }: ConstraintsFormProps) {
  const constraints = useQuery(api.constraints.getConstraints, { roomId });
  const updateConstraints = useMutation(api.constraints.updateConstraints);

  const [allergies, setAllergies] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState("");
  const [dietFilters, setDietFilters] = useState<string[]>([]);
  const [cookingMethods, setCookingMethods] = useState<string[]>([]);
  const [cuisinePreferences, setCuisinePreferences] = useState<string[]>([]);
  const [mealType, setMealType] = useState("");
  const [timeLimitMins, setTimeLimitMins] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (constraints) {
      setAllergies(constraints.allergies || []);
      setDietFilters(constraints.dietFilters || []);
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
        allergies: allergies.length > 0 ? allergies : [],
        dietFilters: dietFilters.length > 0 ? dietFilters : [],
        cookingMethods: cookingMethods.length > 0 ? cookingMethods : [],
        cuisinePreferences: cuisinePreferences.length > 0 ? cuisinePreferences : [],
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

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-bold text-gray-900 mb-4">⚙️ Constraints</h3>

      <div className="space-y-4">
        <ToggleChips
          label="Allergies"
          options={ALLERGY_OPTIONS}
          selected={allergies}
          onToggle={(item) => toggleItem(allergies, setAllergies, item)}
        />
        {/* Custom allergies */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customAllergy}
            onChange={(e) => setCustomAllergy(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const val = customAllergy.trim().toLowerCase();
                if (val && !allergies.includes(val)) {
                  setAllergies([...allergies, val]);
                }
                setCustomAllergy("");
              }
            }}
            placeholder="Add custom allergy..."
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          />
          <button
            type="button"
            onClick={() => {
              const val = customAllergy.trim().toLowerCase();
              if (val && !allergies.includes(val)) {
                setAllergies([...allergies, val]);
              }
              setCustomAllergy("");
            }}
            className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition"
          >
            Add
          </button>
        </div>
        {/* Show custom allergies (ones not in the preset list) */}
        {allergies.filter((a) => !ALLERGY_OPTIONS.map((o) => o.toLowerCase()).includes(a)).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allergies
              .filter((a) => !ALLERGY_OPTIONS.map((o) => o.toLowerCase()).includes(a))
              .map((allergy) => (
                <span
                  key={allergy}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-primary-600 text-white"
                >
                  {allergy}
                  <button
                    type="button"
                    onClick={() => setAllergies(allergies.filter((a) => a !== allergy))}
                    className="ml-0.5 hover:text-primary-200"
                  >
                    x
                  </button>
                </span>
              ))}
          </div>
        )}

        <ToggleChips
          label="Dietary Restrictions"
          options={DIET_OPTIONS}
          selected={dietFilters}
          onToggle={(item) => toggleItem(dietFilters, setDietFilters, item)}
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
