import { Recipe } from '@/types/recipe';

interface AppStore {
  imageBase64: string | null;
  imageUri: string | null;
  imageMediaType: 'image/jpeg' | 'image/png' | 'image/webp';
  recipes: Recipe[];
  allShownRecipeNames: string[];
}

const store: AppStore = {
  imageBase64: null,
  imageUri: null,
  imageMediaType: 'image/jpeg',
  recipes: [],
  allShownRecipeNames: [],
};

export function setImage(
  base64: string,
  uri: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp'
) {
  store.imageBase64 = base64;
  store.imageUri = uri;
  store.imageMediaType = mediaType;
  store.recipes = [];
  store.allShownRecipeNames = [];
}

export function setRecipes(recipes: Recipe[]) {
  store.recipes = recipes;
  store.allShownRecipeNames = [
    ...store.allShownRecipeNames,
    ...recipes.map((r) => r.name),
  ];
}

export function getStore() {
  return store;
}
