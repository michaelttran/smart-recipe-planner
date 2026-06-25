import Constants from 'expo-constants';
import { Recipe } from '@/types/recipe';
import { UserPreferences } from '@/types/preferences';
import { WeeklyMealPlan } from '@/types/meal-plan';
import { supabase } from '@/lib/supabase-client';

function getApiBase(): string {
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri ?? 'localhost:8081';
    return `http://${hostUri}`;
  }
  return process.env.EXPO_PUBLIC_API_URL ?? '';
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}

async function post<T>(path: string, body: object): Promise<T> {
  const response = await fetch(`${getApiBase()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error ?? `Server error ${response.status}`);
  return data as T;
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${getApiBase()}${path}`, {
    headers: await authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error ?? `Server error ${response.status}`);
  return data as T;
}

async function del<T>(path: string, body: object): Promise<T> {
  const response = await fetch(`${getApiBase()}${path}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error ?? `Server error ${response.status}`);
  return data as T;
}

export function extractIngredients(imageBase64: string, imageMediaType: string): Promise<string[]> {
  return post<string[]>('/api/ingredients', { imageBase64, imageMediaType });
}

export type RecipeStreamEvent =
  | { type: 'progress'; chars: number }
  | { type: 'complete'; recipes: Recipe[] }
  | { type: 'error'; message: string };

export async function* streamRecipes(
  ingredients: string[],
  excludeRecipeNames: string[],
  preferences: UserPreferences
): AsyncGenerator<RecipeStreamEvent> {
  const response = await fetch(`${getApiBase()}/api/recipes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ ingredients, excludeRecipeNames, preferences }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `Server error ${response.status}`);
  }

  // React Native's fetch may not expose response.body as a ReadableStream.
  // Fall back to reading the full SSE text at once and parsing the events.
  if (!response.body || typeof (response.body as any).getReader !== 'function') {
    const text = await response.text();
    for (const line of text.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      try {
        yield JSON.parse(line.slice(6)) as RecipeStreamEvent;
      } catch {}
    }
    return;
  }

  const reader = (response.body as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let lineBuffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    lineBuffer += decoder.decode(value, { stream: true });
    const lines = lineBuffer.split('\n');
    lineBuffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        yield JSON.parse(line.slice(6)) as RecipeStreamEvent;
      } catch {}
    }
  }
}

export function fetchMealPlan(
  ingredients: string[],
  preferences: UserPreferences
): Promise<WeeklyMealPlan> {
  return post<WeeklyMealPlan>('/api/meal-plan', { ingredients, preferences });
}

export function getFavorites(): Promise<{ id: string; recipe: Recipe }[]> {
  return get<{ id: string; recipe: Recipe }[]>('/api/favorites');
}

export function addFavorite(recipe: Recipe): Promise<{ id: string }> {
  return post<{ id: string }>('/api/favorites', { recipe });
}

export function removeFavorite(recipeName: string): Promise<{ success: boolean }> {
  return del<{ success: boolean }>('/api/favorites', { recipeName });
}
