import { Recipe } from '@/types/recipe';
import { getSupabase, requireUser, errorResponse } from '@/lib/api-helpers';

export async function GET(request: Request) {
  try {
    const userId = await requireUser(request);

    const { data, error } = await getSupabase()
      .from('favorites')
      .select('id, recipe')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUser(request);
    const { recipe } = await request.json() as { recipe: Recipe };

    const { data, error } = await getSupabase()
      .from('favorites')
      .insert({ user_id: userId, recipe, recipe_name: recipe.name })
      .select('id')
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ id: data.id });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await requireUser(request);
    const { recipeName } = await request.json() as { recipeName: string };

    const { error } = await getSupabase()
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('recipe_name', recipeName);

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
