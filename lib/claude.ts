import { Recipe, RecipeListResponse } from '@/types/recipe';
import { UserPreferences } from '@/types/preferences';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const MODEL_BY_TIME = {
  quick: 'claude-haiku-4-5',
  medium: 'claude-sonnet-4-6',
  leisurely: 'claude-opus-4-8',
} as const;

const TIME_CONSTRAINT = {
  quick: 'under 30 minutes total',
  medium: '30–60 minutes total',
  leisurely: 'over an hour is fine',
};

const RECIPE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    recipes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
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
              additionalProperties: false,
              properties: {
                name: { type: 'string' },
                amount: { type: 'string' },
                unit: { type: 'string' },
                notes: { type: 'string' },
              },
              required: ['name', 'amount', 'unit', 'notes'],
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

function buildPrompt(prefs: UserPreferences, excludeNames: string[]): string {
  const lines: string[] = [
    'You are a professional chef. Analyze the ingredients visible in this photo, then generate exactly 5 recipes tailored to the following preferences.',
    '',
    '--- USER PREFERENCES ---',
    `Time available: ${TIME_CONSTRAINT[prefs.timeAvailable]}`,
  ];

  if (prefs.mealType) lines.push(`Meal type: ${prefs.mealType}`);
  if (prefs.flavorProfiles.length > 0)
    lines.push(`Flavor profile: ${prefs.flavorProfiles.join(', ')}`);
  if (prefs.dietaryNeeds.length > 0)
    lines.push(`Dietary requirements (strictly follow): ${prefs.dietaryNeeds.join(', ')}`);
  const cuisines = prefs.cuisineTypes.filter((c) => c !== 'Surprise Me');
  if (cuisines.length > 0)
    lines.push(`Cuisine direction (use these styles): ${cuisines.join(', ')}`);
  if (prefs.extraIngredients.trim())
    lines.push(`Additional ingredients available: ${prefs.extraIngredients.trim()}`);

  lines.push(
    `Ingredient usage: ${
      prefs.useAllIngredients
        ? 'The user is open to recipes that use the photographed ingredients as a base but may also call for additional common ingredients not shown.'
        : 'The user only wants recipes that use the photographed ingredients (plus any extras they listed). Do NOT require ingredients that are not present.'
    }`
  );

  lines.push(
    '',
    '--- INSTRUCTIONS ---',
    'For each recipe provide:',
    '- A unique ID: "recipe-1", "recipe-2", etc.',
    '- An enticing name and 2–3 sentence description',
    '- Accurate prep, cook, and total times',
    '- Servings, difficulty (easy/medium/hard)',
    '- Full ingredient list with precise amounts and units',
    '- Clear step-by-step instructions',
    '- Relevant tags (cuisine, meal type, dietary info)',
  );

  if (excludeNames.length > 0) {
    lines.push(
      '',
      'Do NOT generate any of these already-shown recipes:',
      ...excludeNames.map((n) => `- ${n}`),
      'Generate 5 completely different recipes.'
    );
  }

  lines.push('', 'Make the 5 recipes diverse in cooking method and style.');

  return lines.join('\n');
}

export async function analyzeIngredientsAndGetRecipes(
  imageBase64: string,
  imageMediaType: 'image/jpeg' | 'image/png' | 'image/webp',
  excludeRecipeNames: string[] = [],
  preferences: UserPreferences = {
    timeAvailable: 'medium',
    useAllIngredients: false,
    mealType: null,
    flavorProfiles: [],
    dietaryNeeds: [],
    cuisineTypes: [],
    extraIngredients: '',
  }
): Promise<Recipe[]> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'EXPO_PUBLIC_ANTHROPIC_API_KEY is not set. Create a .env file with your Anthropic API key.'
    );
  }

  const model = MODEL_BY_TIME[preferences.timeAvailable];
  const useThinking = preferences.timeAvailable === 'leisurely';
  const prompt = buildPrompt(preferences, excludeRecipeNames);

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
        model,
        max_tokens: 8000,
        ...(useThinking ? { thinking: { type: 'adaptive' } } : {}),
        output_config: {
          format: {
            type: 'json_schema',
            schema: RECIPE_JSON_SCHEMA,
          },
        },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: imageMediaType, data: imageBase64 },
              },
              { type: 'text', text: prompt },
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
  const textBlock = data.content?.find((b: { type: string }) => b.type === 'text');
  if (!textBlock?.text) throw new Error('No text response from Claude API');

  const result: RecipeListResponse = JSON.parse(textBlock.text);
  if (!Array.isArray(result.recipes) || result.recipes.length === 0)
    throw new Error('Claude did not return any recipes');

  return result.recipes;
}
