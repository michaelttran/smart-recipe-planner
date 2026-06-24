import { Recipe } from '@/types/recipe';
import { UserPreferences, DEFAULT_PREFERENCES } from '@/types/preferences';

interface AppStore {
  imageBase64: string | null;
  imageUri: string | null;
  imageMediaType: 'image/jpeg' | 'image/png' | 'image/webp';
  ingredients: string[];
  recipes: Recipe[];
  recipeBatchSizes: number[];
  allShownRecipeNames: string[];
  preferences: UserPreferences;
  favorites: Recipe[];
}

const store: AppStore = {
  imageBase64: null,
  imageUri: null,
  imageMediaType: 'image/jpeg',
  ingredients: [],
  recipes: [],
  recipeBatchSizes: [],
  allShownRecipeNames: [],
  preferences: { ...DEFAULT_PREFERENCES },
  favorites: [],
};

export function setImage(
  base64: string,
  uri: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp'
) {
  store.imageBase64 = base64;
  store.imageUri = uri;
  store.imageMediaType = mediaType;
  store.ingredients = [];
  store.recipes = [];
  store.recipeBatchSizes = [];
  store.allShownRecipeNames = [];
  store.preferences = { ...DEFAULT_PREFERENCES };
}

export function setIngredients(ingredients: string[]) {
  store.ingredients = ingredients;
}

export function setPreferences(prefs: UserPreferences) {
  store.preferences = prefs;
}

export function setRecipes(recipes: Recipe[]) {
  const ts = Date.now();
  store.recipes = recipes.map((r, i) => ({ ...r, id: `${ts}-${i}` }));
  store.recipeBatchSizes = [recipes.length];
  store.allShownRecipeNames = [
    ...store.allShownRecipeNames,
    ...recipes.map((r) => r.name),
  ];
}

export function appendRecipes(recipes: Recipe[]) {
  const ts = Date.now();
  const offset = store.recipes.length;
  const withIds = recipes.map((r, i) => ({ ...r, id: `${ts}-${offset + i}` }));
  store.recipes = [...store.recipes, ...withIds];
  store.recipeBatchSizes = [...store.recipeBatchSizes, recipes.length];
  store.allShownRecipeNames = [
    ...store.allShownRecipeNames,
    ...recipes.map((r) => r.name),
  ];
}

// Replaces the full favorites list (e.g. after fetching from Supabase).
// Each recipe's id is set to its Supabase row UUID so the detail screen can look it up.
export function setFavorites(items: { id: string; recipe: Recipe }[]) {
  store.favorites = items.map(({ id, recipe }) => ({ ...recipe, id }));
}

export function addToFavorites(recipe: Recipe, supabaseId: string) {
  store.favorites = [{ ...recipe, id: supabaseId }, ...store.favorites];
}

export function removeFromFavorites(recipeName: string) {
  store.favorites = store.favorites.filter((r) => r.name !== recipeName);
}

export function isFavorite(recipeName: string): boolean {
  return store.favorites.some((r) => r.name === recipeName);
}

export function getStore() {
  return store;
}
