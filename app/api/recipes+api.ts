import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { UserPreferences } from '@/types/preferences';
import { Recipe, RecipeListResponse } from '@/types/recipe';

// ── Claude config ────────────────────────────────────────────────────────────

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
          instructions: { type: 'array', items: { type: 'string' } },
          tags: { type: 'array', items: { type: 'string' } },
        },
        required: [
          'id', 'name', 'description', 'prepTime', 'cookTime', 'totalTime',
          'servings', 'difficulty', 'ingredients', 'instructions', 'tags',
        ],
      },
    },
  },
  required: ['recipes'],
};

function buildPrompt(ingredients: string[], prefs: UserPreferences, excludeNames: string[]): string {
  const lines: string[] = [
    'You are a professional chef. Generate exactly 5 recipes using the ingredients listed below.',
    '',
    `--- AVAILABLE INGREDIENTS ---`,
    ingredients.join(', '),
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
    lines.push(`Cuisine direction: ${cuisines.join(', ')}`);
  if (prefs.extraIngredients.trim())
    lines.push(`Additional ingredients available: ${prefs.extraIngredients.trim()}`);
  lines.push(
    `Ingredient usage: ${
      prefs.useAllIngredients
        ? 'Open to recipes that use the photographed ingredients as a base and may call for additional common ingredients.'
        : 'Only use the photographed ingredients (plus any extras listed). Do NOT require ingredients not present.'
    }`
  );
  lines.push('', '--- INSTRUCTIONS ---', 'For each recipe provide:', '- A unique id string', '- An enticing name and 2–3 sentence description', '- Accurate prep, cook, and total times', '- Servings, difficulty (easy/medium/hard)', '- Full ingredient list with precise amounts and units', '- Clear step-by-step instructions', '- Relevant tags');
  if (excludeNames.length > 0) {
    lines.push('', 'Do NOT generate any of these already-shown recipes:', ...excludeNames.map((n) => `- ${n}`), 'Generate 5 completely different recipes.');
  }
  lines.push('', 'Make the 5 recipes diverse in cooking method and style.');
  return lines.join('\n');
}

async function callClaude(
  ingredients: string[],
  preferences: UserPreferences,
  excludeNames: string[]
): Promise<Recipe[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set on the server.');

  const model = MODEL_BY_TIME[preferences.timeAvailable];
  const useThinking = preferences.timeAvailable === 'leisurely';
  const prompt = buildPrompt(ingredients, preferences, excludeNames);

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
        output_config: { format: { type: 'json_schema', schema: RECIPE_JSON_SCHEMA } },
        messages: [
          { role: 'user', content: prompt },
        ],
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Claude API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((b: { type: string }) => b.type === 'text');
  if (!textBlock?.text) throw new Error('No text response from Claude');

  const result: RecipeListResponse = JSON.parse(textBlock.text);
  if (!Array.isArray(result.recipes) || result.recipes.length === 0)
    throw new Error('Claude did not return any recipes');

  return result.recipes;
}

// ── Cache key ────────────────────────────────────────────────────────────────

function buildCacheKey(ingredients: string[], preferences: UserPreferences): string {
  const stablePrefs = {
    timeAvailable: preferences.timeAvailable,
    useAllIngredients: preferences.useAllIngredients,
    mealType: preferences.mealType,
    flavorProfiles: [...preferences.flavorProfiles].sort(),
    dietaryNeeds: [...preferences.dietaryNeeds].sort(),
    cuisineTypes: [...preferences.cuisineTypes].sort(),
    extraIngredients: preferences.extraIngredients.trim().toLowerCase(),
  };
  return createHash('sha256')
    .update(JSON.stringify([...ingredients].sort()))
    .update(JSON.stringify(stablePrefs))
    .digest('hex');
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const { ingredients, preferences, excludeRecipeNames } = await request.json() as {
      ingredients: string[];
      preferences: UserPreferences;
      excludeRecipeNames: string[];
    };

    const isRefresh = excludeRecipeNames?.length > 0;

    if (!isRefresh && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      const cacheKey = buildCacheKey(ingredients, preferences);

      const { data: cached } = await supabase
        .from('recipe_cache')
        .select('recipes, hit_count')
        .eq('cache_key', cacheKey)
        .single();

      if (cached) {
        supabase
          .from('recipe_cache')
          .update({ hit_count: cached.hit_count + 1 })
          .eq('cache_key', cacheKey)
          .then(() => {});
        return Response.json(cached.recipes);
      }

      const recipes = await callClaude(ingredients, preferences, excludeRecipeNames ?? []);

      supabase
        .from('recipe_cache')
        .insert({ cache_key: cacheKey, recipes, hit_count: 1 })
        .then(() => {});

      return Response.json(recipes);
    }

    const recipes = await callClaude(ingredients, preferences, excludeRecipeNames ?? []);
    return Response.json(recipes);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
