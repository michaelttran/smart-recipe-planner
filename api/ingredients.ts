import { requireUser, checkUsage, incrementUsage, errorResponse } from '../lib/api-helpers';

const MODEL = 'claude-opus-4-8';

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const userId = await requireUser(request);
    await checkUsage(userId, 'ingredient_calls');

    const { imageBase64, imageMediaType } = await request.json() as {
      imageBase64: string;
      imageMediaType: string;
    };

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: imageMediaType, data: imageBase64 },
              },
              {
                type: 'text',
                text: 'List every distinct food ingredient visible in this image. Return ONLY a JSON array of lowercase strings, no explanation. Example: ["tomatoes","olive oil","garlic"]',
              },
            ],
          },
        ],
      }),
    });

    const claudeData = await claudeRes.json() as { content: { type: string; text: string }[] };
    const text = claudeData.content.find((b) => b.type === 'text')?.text ?? '[]';
    const ingredients: string[] = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] ?? '[]');

    await incrementUsage(userId, 'ingredient_calls');
    return Response.json(ingredients);
  } catch (err) {
    return errorResponse(err);
  }
}
