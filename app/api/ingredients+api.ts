const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ingredients: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['ingredients'],
};

const PROMPT = `You are analyzing a photo of food ingredients.

Extract every visible ingredient and return a clean, canonical list.

Rules:
- Generic names only: "tomato" not "roma tomato" or "cherry tomato"
- Lowercase singular: "egg" not "Eggs"
- No descriptors: "garlic" not "fresh garlic" or "minced garlic"
- No quantities or units
- Sort alphabetically
- If an item is clearly a condiment or spice container, include it (e.g. "soy sauce", "cumin")`;

export async function POST(request: Request) {
  try {
    const { imageBase64, imageMediaType } = await request.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set on the server.');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

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
          model: 'claude-haiku-4-5',
          max_tokens: 512,
          output_config: { format: { type: 'json_schema', schema: SCHEMA } },
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: { type: 'base64', media_type: imageMediaType, data: imageBase64 },
                },
                { type: 'text', text: PROMPT },
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
      const text = await response.text();
      throw new Error(`Claude error ${response.status}: ${text}`);
    }

    const data = await response.json();
    const textBlock = data.content?.find((b: { type: string }) => b.type === 'text');
    if (!textBlock?.text) throw new Error('No response from Claude');

    const result = JSON.parse(textBlock.text);
    return Response.json(result.ingredients as string[]);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
