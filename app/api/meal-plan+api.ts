import { UserPreferences } from '@/types/preferences';
import { WeeklyMealPlan } from '@/types/meal-plan';
import { requireUser, checkUsage, incrementUsage, errorResponse } from '@/lib/api-helpers';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const MEAL_PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    days: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          day: { type: 'string' },
          recipe: {
            type: 'object',
            additionalProperties: false,
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              totalTime: { type: 'string' },
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
              macros: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  calories: { type: 'integer' },
                  proteinG: { type: 'number' },
                  carbsG: { type: 'number' },
                  fatG: { type: 'number' },
                  fiberG: { type: 'number' },
                },
                required: ['calories', 'proteinG', 'carbsG', 'fatG', 'fiberG'],
              },
            },
            required: ['name', 'description', 'totalTime', 'difficulty', 'ingredients', 'instructions', 'tags', 'macros'],
          },
        },
        required: ['day', 'recipe'],
      },
    },
    shoppingList: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          amount: { type: 'string' },
          unit: { type: 'string' },
        },
        required: ['name', 'amount', 'unit'],
      },
    },
  },
  required: ['days', 'shoppingList'],
};

function buildPrompt(ingredients: string[], prefs: UserPreferences): string {
  const lines = [
    'You are a professional meal planner. Create a 7-day dinner plan (Monday through Sunday) using the available ingredients below.',
    '',
    '--- AVAILABLE INGREDIENTS ---',
    ingredients.join(', '),
    '',
    '--- USER PREFERENCES ---',
  ];

  if (prefs.dietaryNeeds.length > 0)
    lines.push(`Dietary requirements (strictly follow): ${prefs.dietaryNeeds.join(', ')}`);
  if (prefs.flavorProfiles.length > 0)
    lines.push(`Flavor profile: ${prefs.flavorProfiles.join(', ')}`);
  const cuisines = prefs.cuisineTypes.filter((c) => c !== 'Surprise Me');
  if (cuisines.length > 0)
    lines.push(`Cuisine direction: ${cuisines.join(', ')}`);
  if (prefs.extraIngredients.trim())
    lines.push(`Additional pantry staples: ${prefs.extraIngredients.trim()}`);

  lines.push(
    '',
    '--- INSTRUCTIONS ---',
    `Plan 7 dinners for ${DAYS.join(', ')}.`,
    '',
    'Key goals:',
    '- Vary cooking methods and cuisines across the week',
    '- Strategically reuse ingredients across meals to minimize waste (e.g. if you use half a can of coconut milk Monday, use the rest Thursday)',
    '- Balance lighter meals (salads, soups) with heartier ones',
    '- Keep each recipe realistic and complete with full ingredient lists',
    '',
    'After the 7 days, provide a consolidated shopping list that combines ALL ingredients across all meals.',
    'In the shopping list, merge duplicate ingredients (add their amounts together), and only list items not already in the available ingredients above.'
  );

  return lines.join('\n');
}

export async function POST(request: Request) {
  try {
    const userId = await requireUser(request);
    await checkUsage(userId, 'recipe_calls');

    const { ingredients, preferences } = await request.json() as {
      ingredients: string[];
      preferences: UserPreferences;
    };

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set on the server.');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000);

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
          model: 'claude-sonnet-4-6',
          max_tokens: 12000,
          output_config: { format: { type: 'json_schema', schema: MEAL_PLAN_SCHEMA } },
          messages: [{ role: 'user', content: buildPrompt(ingredients, preferences) }],
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
    if (!textBlock?.text) throw new Error('No response from Claude');

    const mealPlan: WeeklyMealPlan = JSON.parse(textBlock.text);

    incrementUsage(userId, 'recipe_calls');

    return Response.json(mealPlan);
  } catch (err) {
    return errorResponse(err);
  }
}
