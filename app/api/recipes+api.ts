import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { UserPreferences } from '@/types/preferences';
import { Recipe, RecipeListResponse } from '@/types/recipe';
import { requireUser, checkUsage, incrementUsage, errorResponse } from '@/lib/api-helpers';

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
        required: [
          'id', 'name', 'description', 'prepTime', 'cookTime', 'totalTime',
          'servings', 'difficulty', 'ingredients', 'instructions', 'tags', 'macros',
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

function sseStream(chunks: (() => Promise<void>)[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      try {
        for (const chunk of chunks) {
          await chunk();
        }
      } finally {
        controller.close();
      }
      void enqueue; // silence unused warning — enqueue is used inside closures
    },
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  function sse(data: object): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
  }

  try {
    const userId = await requireUser(request);

    const { ingredients, preferences, excludeRecipeNames } = await request.json() as {
      ingredients: string[];
      preferences: UserPreferences;
      excludeRecipeNames: string[];
    };

    const isRefresh = excludeRecipeNames?.length > 0;
    const hasSupa = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY;
    const supabase = hasSupa
      ? createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
      : null;

    // ── Cache check ────────────────────────────────────────────────────────────
    if (!isRefresh && supabase) {
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

        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(sse({ type: 'complete', recipes: cached.recipes }));
            controller.close();
          },
        });
        return new Response(stream, {
          headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
        });
      }
    }

    // ── Rate limit ─────────────────────────────────────────────────────────────
    await checkUsage(userId, 'recipe_calls');

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set on the server.');

    const model = MODEL_BY_TIME[preferences.timeAvailable];
    const useThinking = preferences.timeAvailable === 'leisurely';
    const prompt = buildPrompt(ingredients, preferences, excludeRecipeNames ?? []);
    const cacheKey = !isRefresh && supabase ? buildCacheKey(ingredients, preferences) : null;

    // ── Streaming Claude call ─────────────────────────────────────────────────
    const claudeRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 8000,
        stream: true,
        ...(useThinking ? { thinking: { type: 'adaptive' } } : {}),
        output_config: { format: { type: 'json_schema', schema: RECIPE_JSON_SCHEMA } },
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!claudeRes.ok) {
      const text = await claudeRes.text();
      throw new Error(`Claude API error ${claudeRes.status}: ${text}`);
    }

    const outputStream = new ReadableStream({
      async start(controller) {
        const reader = claudeRes.body!.getReader();
        const dec = new TextDecoder();
        let accumulatedText = '';
        let lineBuffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            lineBuffer += dec.decode(value, { stream: true });
            const lines = lineBuffer.split('\n');
            lineBuffer = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const raw = line.slice(6).trim();
              if (raw === '[DONE]') continue;
              try {
                const event = JSON.parse(raw);
                if (
                  event.type === 'content_block_delta' &&
                  event.delta?.type === 'text_delta'
                ) {
                  accumulatedText += event.delta.text;
                  controller.enqueue(
                    sse({ type: 'progress', chars: accumulatedText.length })
                  );
                }
              } catch {}
            }
          }

          const result: RecipeListResponse = JSON.parse(accumulatedText);
          const recipes = result.recipes;

          controller.enqueue(sse({ type: 'complete', recipes }));

          // Background: usage + cache
          incrementUsage(userId, 'recipe_calls');
          if (supabase && cacheKey) {
            supabase
              .from('recipe_cache')
              .insert({ cache_key: cacheKey, recipes, hit_count: 1 })
              .then(() => {});
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to generate recipes';
          controller.enqueue(sse({ type: 'error', message }));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(outputStream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
