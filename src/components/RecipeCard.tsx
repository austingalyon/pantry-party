export interface Recipe {
  _id: string;
  title: string;
  description: string;
  ingredients: Array<{
    name: string;
    amount?: string;
    preparation?: string;
  }>;
  steps: string[];
  tags: string[];
  estimatedTimeMinutes: number;
  servings: number;
  sensitivityFlags: string[];
  voteCount?: number;
}

interface RecipeCardProps {
  recipe: Recipe;
  roomId: string;
  onVote: (recipeId: string) => void;
  userHasVoted: boolean;
}

export default function RecipeCard({ recipe, roomId, onVote, userHasVoted }: RecipeCardProps) {
  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-primary-400 transition">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{recipe.title}</h3>
          <p className="text-gray-600 text-sm">{recipe.description}</p>
        </div>
        <div className="flex items-center gap-2 text-primary-600 font-bold text-lg">
          <span>🗳️</span>
          <span>{recipe.voteCount || 0}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {recipe.tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
        <span>⏱️ {recipe.estimatedTimeMinutes} mins</span>
        <span>🍽️ {recipe.servings} servings</span>
      </div>

      {recipe.sensitivityFlags.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-xs font-semibold text-yellow-800 mb-1">⚠️ Contains:</p>
          <p className="text-xs text-yellow-700">{recipe.sensitivityFlags.join(', ')}</p>
        </div>
      )}

      <details className="mb-4">
        <summary className="cursor-pointer text-sm font-semibold text-primary-600 hover:text-primary-700">
          View Full Recipe
        </summary>
        <div className="mt-4 space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Ingredients:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              {recipe.ingredients.map((ing, idx) => (
                <li key={idx}>
                  {ing.amount ? `${ing.amount} ` : ''}
                  {ing.name}
                  {ing.preparation ? ` (${ing.preparation})` : ''}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Instructions:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              {recipe.steps.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      </details>

      <button
        onClick={() => onVote(recipe._id)}
        className={`w-full py-2 px-4 rounded-lg font-semibold transition ${
          userHasVoted
            ? 'bg-primary-600 text-white hover:bg-primary-700'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        {userHasVoted ? '✓ Voted' : 'Vote for This Recipe'}
      </button>
    </div>
  );
}
