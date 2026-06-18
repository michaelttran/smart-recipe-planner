import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe } from '@/types/recipe';
import { UserPreferences, DEFAULT_PREFERENCES } from '@/types/preferences';

const FAVORITES_KEY = '@dishdrop/favorites';

interface AppStore {
  imageBase64: string | null;
  imageUri: string | null;
  imageMediaType: 'image/jpeg' | 'image/png' | 'image/webp';
  ingredients: string[];
  recipes: Recipe[];
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
  allShownRecipeNames: [],
  preferences: { ...DEFAULT_PREFERENCES },
  favorites: [],
};

// Load persisted favorites on startup
AsyncStorage.getItem(FAVORITES_KEY)
  .then((json) => {
    if (json) store.favorites = JSON.parse(json);
  })
  .catch(() => {});

function persistFavorites() {
  AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(store.favorites)).catch(() => {});
}

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
  store.allShownRecipeNames = [
    ...store.allShownRecipeNames,
    ...recipes.map((r) => r.name),
  ];
}

export function toggleFavorite(recipe: Recipe) {
  const idx = store.favorites.findIndex((r) => r.id === recipe.id);
  if (idx >= 0) {
    store.favorites = store.favorites.filter((r) => r.id !== recipe.id);
  } else {
    store.favorites = [recipe, ...store.favorites];
  }
  persistFavorites();
}

export function isFavorite(recipeId: string): boolean {
  return store.favorites.some((r) => r.id === recipeId);
}

export function getStore() {
  return store;
}
