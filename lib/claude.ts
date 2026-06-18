import { Recipe, RecipeListResponse } from '@/types/recipe';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-4-8';

const RECIPE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    recipes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          prepTime: { type: 'string' },
          cookTime: { type: 'string' },
          totalTime: { type: 'string' },
          servings: { type: 'integer' },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
          ingredients: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                amount: { type: 'string' },
                unit: { type: 'string' },
                notes: { type: 'string' },
              },
              required: ['name', 'amount', 'unit'],
            },
          },
          instructions: {
            type: 'array',
            items: { type: 'string' },
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: [
          'id',
          'name',
          'description',
          'prepTime',
          'cookTime',
          'totalTime',
          'servings',
          'difficulty',
          'ingredients',
          'instructions',
          'tags',
        ],
      },
    },
  },
  required: ['recipes'],
};

export async function analyzeIngredientsAndGetRecipes(
  imageBase64: string,
  imageMediaType: 'image/jpeg' | 'image/png' | 'image/webp',
  excludeRecipeNames: string[] = []
): Promise<Recipe[]> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'EXPO_PUBLIC_ANTHROPIC_API_KEY is not set. Create a .env file with your Anthropic API key.'
    );
  }

  const exclusionNote =
    excludeRecipeNames.length > 0
      ? `\n\nIMPORTANT: You have already shown these recipes — do NOT generate any of them again:\n${excludeRecipeNames.map((n) => `- ${n}`).join('\n')}\n\nGenerate 5 completely different recipes.`
      : '';

  const prompt = `You are a professional chef. Carefully analyze the ingredients visible in this photo, then generate exactly 5 creative and delicious recipes that can be made primarily from those ingredients.

For each recipe provide:
- A unique ID in the format "recipe-1", "recipe-2", etc.
- Clear recipe name and an enticing description (2-3 sentences)
- Accurate prep time, cook time, and total time (e.g. "15 minutes", "30 minutes")
- Number of servings
- Difficulty level: easy, medium, or hard
- Complete ingredient list with precise amounts and units
- Clear numbered step-by-step instructions
- Relevant tags (e.g. cuisine type, meal type, dietary info)${exclusionNote}

Make the 5 recipes diverse — vary cuisines, cooking methods, and complexity levels.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  let response: Response;
  try {
    response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 16000,
        thinking: { type: 'adaptive' },
        output_config: {
          format: {
            type: 'json_schema',
            json_schema: {
              name: 'recipe_list',
              schema: RECIPE_JSON_SCHEMA,
            },
          },
        },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: imageMediaType,
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  const textBlock = data.content?.find(
    (block: { type: string }) => block.type === 'text'
  );
  if (!textBlock?.text) {
    throw new Error('No text response from Claude API');
  }

  const result: RecipeListResponse = JSON.parse(textBlock.text);
  if (!Array.isArray(result.recipes) || result.recipes.length === 0) {
    throw new Error('Claude did not return any recipes');
  }

  return result.recipes;
}
