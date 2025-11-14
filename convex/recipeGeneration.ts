import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Recipe generation action
export const generateRecipes = action({
  args: {
    roomId: v.id("rooms"),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ recipeIds: string[]; count: number }> => {
    // TODO: Re-enable auth when ready
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity) {
    //   throw new Error("Not authenticated");
    // }

    const count = args.count || 10;

    // Get room data
    const room = await ctx.runQuery(api.rooms.getRoom, { roomId: args.roomId });
    if (!room) {
      throw new Error("Room not found");
    }

    // Auth check temporarily disabled
    // const isParticipant = room.participants.some(
    //   (p: any) => p.userId === identity.subject
    // );
    // if (!isParticipant) {
    //   throw new Error("Not a participant in this room");
    // }

    // Update room status to generating
    await ctx.runMutation(api.recipes.updateRoomStatus, {
      roomId: args.roomId,
      status: "generating",
    });

    try {
      // Build the prompt
      const ingredientList = room.ingredients
        .map((ing: any) => {
          if (ing.amount && ing.unit) {
            return `${ing.amount} ${ing.unit} ${ing.name}`;
          }
          return ing.name;
        })
        .join(", ");

      const constraints = room.constraints || {};
      const systemPrompt = buildSystemPrompt();
      const userPrompt = buildUserPrompt(ingredientList, constraints, count);

      // Call OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      });

      const responseText = completion.choices[0].message.content;
      if (!responseText) {
        throw new Error("Empty response from OpenAI");
      }

      const parsed = JSON.parse(responseText);
      const recipes = parsed.recipes || [];

      // Validate and filter recipes
      const validRecipes = recipes
        .filter((recipe: any) => validateRecipe(recipe, constraints))
        .slice(0, count);

      if (validRecipes.length === 0) {
        throw new Error("No valid recipes generated");
      }

      // Save recipes to database
      const recipeIds: string[] = [];
      for (const recipe of validRecipes) {
        const id = await ctx.runMutation(api.recipes.createRecipe, {
          roomId: args.roomId,
          title: recipe.title,
          description: recipe.description,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          tags: recipe.tags || [],
          estimatedTimeMinutes: recipe.estimatedTimeMinutes || 30,
          servings: recipe.servings || 4,
          sensitivityFlags: recipe.sensitivityFlags || [],
          aiMetadata: {
            model: completion.model,
            promptTokens: completion.usage?.prompt_tokens,
            completionTokens: completion.usage?.completion_tokens,
          },
        });
        recipeIds.push(id);
      }

      // Update room status to voting
      await ctx.runMutation(api.recipes.updateRoomStatus, {
        roomId: args.roomId,
        status: "voting",
      });

      return { recipeIds, count: recipeIds.length };
    } catch (error) {
      // Revert status on error
      await ctx.runMutation(api.recipes.updateRoomStatus, {
        roomId: args.roomId,
        status: "draft",
      });
      throw error;
    }
  },
});

// Helper: Build system prompt for OpenAI
function buildSystemPrompt(): string {
  return `You are KitchenCopilot, a precise recipe generator. Given a list of ingredients and constraints, generate creative, realistic recipes that the group can cook together.

Output a JSON object with this exact structure:
{
  "recipes": [
    {
      "title": "Recipe Name",
      "description": "Brief 1-2 sentence description",
      "ingredients": [
        {
          "name": "ingredient name",
          "amount": "1 cup" (optional),
          "preparation": "diced" (optional)
        }
      ],
      "steps": ["Step 1", "Step 2", ...],
      "tags": ["quick", "vegetarian", "grilling"],
      "estimatedTimeMinutes": 30,
      "servings": 4,
      "sensitivityFlags": ["contains_nuts", "contains_dairy"]
    }
  ]
}

CRITICAL: Respect all dietary restrictions and allergies. Mark sensitivity flags accurately. Be conservative with substitutions.`;
}

// Helper: Build user prompt
function buildUserPrompt(
  ingredientList: string,
  constraints: any,
  count: number
): string {
  let prompt = `Generate ${count} diverse recipes using these ingredients:\n${ingredientList}\n\n`;

  if (constraints.allergies && constraints.allergies.length > 0) {
    prompt += `FORBIDDEN ALLERGENS (must exclude): ${constraints.allergies.join(", ")}\n`;
  }

  if (constraints.dietFilters && constraints.dietFilters.length > 0) {
    prompt += `Dietary filters: ${constraints.dietFilters.join(", ")}\n`;
  }

  if (constraints.mealType) {
    prompt += `Meal type: ${constraints.mealType}\n`;
  }

  if (constraints.cookingMethods && constraints.cookingMethods.length > 0) {
    prompt += `Preferred cooking methods: ${constraints.cookingMethods.join(", ")}\n`;
  }

  if (constraints.timeLimitMins) {
    prompt += `Time limit: ${constraints.timeLimitMins} minutes\n`;
  }

  if (constraints.cuisinePreferences && constraints.cuisinePreferences.length > 0) {
    prompt += `Cuisine preferences: ${constraints.cuisinePreferences.join(", ")}\n`;
  }

  prompt += `\nProvide diverse options with clear instructions. Output JSON only.`;

  return prompt;
}

// Helper: Validate recipe against constraints
function validateRecipe(recipe: any, constraints: any): boolean {
  if (!recipe.title || !recipe.steps || !Array.isArray(recipe.steps)) {
    return false;
  }

  // Check for forbidden allergens
  if (constraints.allergies && constraints.allergies.length > 0) {
    const forbiddenTerms = constraints.allergies.map((a: string) =>
      a.toLowerCase()
    );

    // Check recipe title, description, and ingredients
    const recipeText = `${recipe.title} ${recipe.description || ""} ${JSON.stringify(recipe.ingredients || [])}`.toLowerCase();

    for (const term of forbiddenTerms) {
      if (recipeText.includes(term)) {
        return false;
      }
    }
  }

  return true;
}
