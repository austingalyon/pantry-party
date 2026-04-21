import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { ALLERGY_OPTIONS, DIET_OPTIONS } from "./constants";

interface DietaryProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DietaryProfileModal({ isOpen, onClose }: DietaryProfileModalProps) {
  const profile = useQuery(api.userProfiles.getMyProfile);
  const updateProfile = useMutation(api.userProfiles.updateMyProfile);

  const [allergies, setAllergies] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState("");
  const [dietFilters, setDietFilters] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setAllergies(profile.allergies || []);
      setDietFilters(profile.dietFilters || []);
    }
  }, [profile]);

  const toggleItem = (list: string[], setList: (val: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const addCustomAllergy = () => {
    const val = customAllergy.trim().toLowerCase();
    if (val && !allergies.includes(val)) {
      setAllergies([...allergies, val]);
    }
    setCustomAllergy("");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({ allergies, dietFilters });
      onClose();
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const customAllergies = allergies.filter(
    (a) => !ALLERGY_OPTIONS.map((o) => o.toLowerCase()).includes(a)
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">My Dietary Profile</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>

          <div className="space-y-4">
            {/* Allergies */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Allergies</label>
              <div className="flex flex-wrap gap-2">
                {ALLERGY_OPTIONS.map((option) => {
                  const isSelected = allergies.includes(option.toLowerCase());
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleItem(allergies, setAllergies, option.toLowerCase())}
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

            {/* Custom allergy input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customAllergy}
                onChange={(e) => setCustomAllergy(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomAllergy();
                  }
                }}
                placeholder="Add custom allergy..."
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
              <button
                type="button"
                onClick={addCustomAllergy}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition"
              >
                Add
              </button>
            </div>

            {/* Custom allergy chips */}
            {customAllergies.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {customAllergies.map((allergy) => (
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
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Dietary restrictions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dietary Restrictions</label>
              <div className="flex flex-wrap gap-2">
                {DIET_OPTIONS.map((option) => {
                  const isSelected = dietFilters.includes(option.toLowerCase());
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleItem(dietFilters, setDietFilters, option.toLowerCase())}
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

            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`w-full px-4 py-2 rounded-lg font-semibold transition text-sm ${
                isSaving
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-primary-600 text-white hover:bg-primary-700"
              }`}
            >
              {isSaving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
