import { requireUser, getSupabase, errorResponse } from '../lib/api-helpers';
import { Recipe } from '../types/recipe';

export default async function handler(request: Request): Promise<Response> {
  try {
    const userId = await requireUser(request);
    const supabase = getSupabase();

    if (request.method === 'GET') {
      const { data, error } = await supabase
        .from('favorites')
        .select('id, recipe')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return Response.json(data ?? []);
    }

    if (request.method === 'POST') {
      const { recipe } = await request.json() as { recipe: Recipe };
      const { data, error } = await supabase
        .from('favorites')
        .insert({ user_id: userId, recipe })
        .select('id')
        .single();

      if (error) throw error;
      return Response.json({ id: (data as { id: string }).id });
    }

    if (request.method === 'DELETE') {
      const { recipeName } = await request.json() as { recipeName: string };
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('recipe->>name', recipeName);

      if (error) throw error;
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  } catch (err) {
    return errorResponse(err);
  }
}
