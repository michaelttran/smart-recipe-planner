import Constants from 'expo-constants';
import { Recipe } from '@/types/recipe';
import { UserPreferences } from '@/types/preferences';
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

export function fetchRecipes(
  ingredients: string[],
  excludeRecipeNames: string[],
  preferences: UserPreferences
): Promise<Recipe[]> {
  return post<Recipe[]>('/api/recipes', { ingredients, excludeRecipeNames, preferences });
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
