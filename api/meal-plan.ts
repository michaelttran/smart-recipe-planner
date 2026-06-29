import { requireUser, errorResponse } from '../lib/api-helpers';
import { UserPreferences } from '../types/preferences';

const MODEL = 'claude-opus-4-8';

const MEAL_PLAN_SCHEMA = {
  type: 'object',
  properties: {
    days: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          day: { type: 'string' },
          recipe: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              totalTime: { type: 'string' },
              difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
              ingredients: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    amount: { type: 'string' },
                    unit: { type: 'string' },
                  },
                  required: ['name', 'amount', 'unit'],
                },
              },
              instructions: { type: 'array', items: { type: 'string' } },
              tags: { type: 'array', items: { type: 'string' } },
              macros: {
                type: 'object',
                properties: {
                  calories: { type: 'number' },
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

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const userId = await requireUser(request);
    void userId; // auth check only — no usage tracking for meal plans

    const { ingredients, preferences } = await request.json() as {
      ingredients: string[];
      preferences: UserPreferences;
    };

    const prompt = [
      `Create a 7-day meal plan using these ingredients: ${ingredients.join(', ')}.`,
      preferences.dietaryNeeds.length ? `Dietary needs: ${preferences.dietaryNeeds.join(', ')}.` : '',
      preferences.cuisineTypes.length ? `Cuisine preferences: ${preferences.cuisineTypes.join(', ')}.` : '',
      'Include a consolidated shopping list for the week.',
    ].filter(Boolean).join('\n');

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'output-128k-2025-02-19',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        thinking: { type: 'adaptive' },
        output_config: { format: { type: 'json_schema', json_schema: { name: 'meal_plan', schema: MEAL_PLAN_SCHEMA, strict: true } } },
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const claudeData = await claudeRes.json() as { content: { type: string; text: string }[] };
    const text = claudeData.content.find((b) => b.type === 'text')?.text ?? '{"days":[],"shoppingList":[]}';
    const plan = JSON.parse(text);

    return Response.json(plan);
  } catch (err) {
    return errorResponse(err);
  }
}
