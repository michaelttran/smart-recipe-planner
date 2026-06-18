import Constants from 'expo-constants';
import { Recipe } from '@/types/recipe';
import { UserPreferences } from '@/types/preferences';

function getApiBase(): string {
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri ?? 'localhost:8081';
    return `http://${hostUri}`;
  }
  return process.env.EXPO_PUBLIC_API_URL ?? '';
}

async function post<T>(path: string, body: object): Promise<T> {
  const response = await fetch(`${getApiBase()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error ?? `Server error ${response.status}`);
  return data as T;
}

export function extractIngredients(
  imageBase64: string,
  imageMediaType: string
): Promise<string[]> {
  return post<string[]>('/api/ingredients', { imageBase64, imageMediaType });
}

export function fetchRecipes(
  ingredients: string[],
  excludeRecipeNames: string[],
  preferences: UserPreferences
): Promise<Recipe[]> {
  return post<Recipe[]>('/api/recipes', { ingredients, excludeRecipeNames, preferences });
}
