export interface Ingredient {
  _id: string;
  name: string;
  amount?: string;
  unit?: string;
  rawText: string;
  userName: string;
  detectedFrom: 'text' | 'speech' | 'image';
  confidence?: number;
}

interface IngredientListProps {
  roomId: string;
  ingredients: Ingredient[];
}

export default function IngredientList({ roomId, ingredients }: IngredientListProps) {
  return (
    <div className="space-y-2">
      {ingredients.length === 0 ? (
        <p className="text-gray-500 italic">No ingredients yet. Add some!</p>
      ) : (
        ingredients.map((ingredient) => (
          <div
            key={ingredient._id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {ingredient.detectedFrom === 'speech' ? '🎤' : 
                 ingredient.detectedFrom === 'image' ? '📸' : '✍️'}
              </span>
              <div>
                <p className="font-medium text-gray-900">
                  {ingredient.amount && ingredient.unit
                    ? `${ingredient.amount} ${ingredient.unit} `
                    : ''}
                  {ingredient.name}
                </p>
                <p className="text-sm text-gray-500">Added by {ingredient.userName}</p>
              </div>
            </div>
            <button
              onClick={() => {
                // TODO: Call Convex mutation to remove ingredient
                console.log('Remove ingredient:', ingredient._id);
              }}
              className="text-red-500 hover:text-red-700 text-sm font-semibold"
            >
              Remove
            </button>
          </div>
        ))
      )}
    </div>
  );
}
