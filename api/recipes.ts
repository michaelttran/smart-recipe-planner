import { requireUser, checkUsage, incrementUsage, errorResponse } from '../lib/api-helpers';
import { UserPreferences } from '../types/preferences';

const MODEL = 'claude-opus-4-8';

const RECIPE_SCHEMA = {
  type: 'object',
  properties: {
    recipes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          prepTime: { type: 'string' },
          cookTime: { type: 'string' },
          totalTime: { type: 'string' },
          servings: { type: 'number' },
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
        required: ['name', 'description', 'prepTime', 'cookTime', 'totalTime', 'servings', 'difficulty', 'ingredients', 'instructions', 'tags', 'macros'],
      },
    },
  },
  required: ['recipes'],
};

function buildPrompt(ingredients: string[], excludeRecipeNames: string[], prefs: UserPreferences): string {
  const timeMap = { quick: 'under 30 minutes', medium: '30–60 minutes', leisurely: 'over 60 minutes' };
  const lines = [
    `Generate 5 creative recipes using these ingredients: ${ingredients.join(', ')}.`,
    `Total time: ${timeMap[prefs.timeAvailable]}.`,
  ];
  if (prefs.useAllIngredients) lines.push('Try to use all listed ingredients.');
  if (prefs.mealType) lines.push(`Meal type: ${prefs.mealType}.`);
  if (prefs.flavorProfiles.length) lines.push(`Flavor profiles: ${prefs.flavorProfiles.join(', ')}.`);
  if (prefs.dietaryNeeds.length) lines.push(`Dietary needs: ${prefs.dietaryNeeds.join(', ')}.`);
  if (prefs.cuisineTypes.length) lines.push(`Cuisine types: ${prefs.cuisineTypes.join(', ')}.`);
  if (prefs.extraIngredients) lines.push(`Extra ingredients available: ${prefs.extraIngredients}.`);
  if (excludeRecipeNames.length) lines.push(`Do not suggest these recipes again: ${excludeRecipeNames.join(', ')}.`);
  return lines.join('\n');
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const userId = await requireUser(request);
    await checkUsage(userId, 'recipe_calls');

    const { ingredients, excludeRecipeNames, preferences } = await request.json() as {
      ingredients: string[];
      excludeRecipeNames: string[];
      preferences: UserPreferences;
    };

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
        output_config: { format: { type: 'json_schema', json_schema: { name: 'recipes', schema: RECIPE_SCHEMA, strict: true } } },
        messages: [{ role: 'user', content: buildPrompt(ingredients, excludeRecipeNames, preferences) }],
      }),
    });

    const claudeData = await claudeRes.json() as { content: { type: string; text: string }[] };
    const text = claudeData.content.find((b) => b.type === 'text')?.text ?? '{"recipes":[]}';
    const { recipes } = JSON.parse(text) as { recipes: unknown[] };

    // Stream SSE so mobile and web both get progress updates
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const ts = Date.now();
        const withIds = (recipes as Record<string, unknown>[]).map((r, i) => ({ ...r, id: `${ts}-${i}` }));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', recipes: withIds })}\n\n`));
        controller.close();
      },
    });

    incrementUsage(userId, 'recipe_calls').catch(() => {});

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
