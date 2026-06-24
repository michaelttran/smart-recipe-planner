import { createClient } from '@supabase/supabase-js';
import { Recipe } from '@/types/recipe';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

async function getUserId(request: Request): Promise<string | null> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const { data: { user } } = await getSupabase().auth.getUser(auth.slice(7));
  return user?.id ?? null;
}

export async function GET(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await getSupabase()
    .from('favorites')
    .select('id, recipe')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { recipe } = await request.json() as { recipe: Recipe };

  const { data, error } = await getSupabase()
    .from('favorites')
    .insert({ user_id: userId, recipe, recipe_name: recipe.name })
    .select('id')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ id: data.id });
}

export async function DELETE(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { recipeName } = await request.json() as { recipeName: string };

  const { error } = await getSupabase()
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('recipe_name', recipeName);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
