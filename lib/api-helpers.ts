import { createClient } from '@supabase/supabase-js';

export function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

export async function requireUser(request: Request): Promise<string> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) throw new ApiError(401, 'Unauthorized');
  const { data: { user } } = await getSupabase().auth.getUser(auth.slice(7));
  if (!user) throw new ApiError(401, 'Unauthorized');
  return user.id;
}

export const DAILY_LIMITS = {
  ingredient_calls: 20,
  recipe_calls: 10,
} as const;

export type UsageField = keyof typeof DAILY_LIMITS;

export async function checkUsage(userId: string, field: UsageField): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await getSupabase()
    .from('usage')
    .select(field)
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  const count = ((data as Record<string, number> | null)?.[field] ?? 0);
  const limit = DAILY_LIMITS[field];
  if (count >= limit) {
    const label = field === 'ingredient_calls' ? 'ingredient scans' : 'recipe generations';
    throw new ApiError(429, `Daily limit reached — ${limit} ${label}/day. Try again tomorrow.`);
  }
}

export async function incrementUsage(userId: string, field: UsageField): Promise<void> {
  await getSupabase().rpc('increment_usage', { p_user_id: userId, p_field: field });
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function errorResponse(err: unknown): Response {
  if (err instanceof ApiError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  const message = err instanceof Error ? err.message : 'Unknown error';
  return Response.json({ error: message }, { status: 500 });
}
