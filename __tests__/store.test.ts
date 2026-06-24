import {
  getStore,
  setImage,
  setIngredients,
  setRecipes,
  appendRecipes,
  setFavorites,
  addToFavorites,
  removeFromFavorites,
  isFavorite,
} from '@/lib/store';
import { Recipe } from '@/types/recipe';

function makeRecipe(name: string): Recipe {
  return {
    id: '',
    name,
    description: `A ${name} recipe`,
    prepTime: '10 min',
    cookTime: '20 min',
    totalTime: '30 min',
    servings: 2,
    difficulty: 'easy',
    ingredients: [{ name: 'ingredient', amount: '1', unit: 'cup' }],
    instructions: ['Step 1'],
    tags: ['tag'],
    macros: { calories: 300, proteinG: 10, carbsG: 40, fatG: 8, fiberG: 3 },
  };
}

beforeEach(() => {
  setImage('', '', 'image/jpeg');
  setFavorites([]);
});

// ── setImage ─────────────────────────────────────────────────────────────────

describe('setImage', () => {
  it('clears ingredients, recipes, and preferences', () => {
    setIngredients(['tomato', 'onion']);
    setRecipes([makeRecipe('Pasta')]);
    setImage('base64data', 'file://photo.jpg', 'image/jpeg');

    const store = getStore();
    expect(store.imageBase64).toBe('base64data');
    expect(store.imageUri).toBe('file://photo.jpg');
    expect(store.ingredients).toEqual([]);
    expect(store.recipes).toEqual([]);
    expect(store.recipeBatchSizes).toEqual([]);
  });
});

// ── setRecipes ────────────────────────────────────────────────────────────────

describe('setRecipes', () => {
  it('assigns client-side IDs with timestamp prefix', () => {
    setRecipes([makeRecipe('Pasta'), makeRecipe('Salad')]);
    const { recipes } = getStore();
    expect(recipes).toHaveLength(2);
    expect(recipes[0].id).toMatch(/^\d+-0$/);
    expect(recipes[1].id).toMatch(/^\d+-1$/);
  });

  it('initialises recipeBatchSizes to a single batch', () => {
    setRecipes([makeRecipe('A'), makeRecipe('B'), makeRecipe('C')]);
    expect(getStore().recipeBatchSizes).toEqual([3]);
  });

  it('tracks recipe names in allShownRecipeNames', () => {
    setRecipes([makeRecipe('Pasta'), makeRecipe('Salad')]);
    expect(getStore().allShownRecipeNames).toContain('Pasta');
    expect(getStore().allShownRecipeNames).toContain('Salad');
  });

  it('replaces previous recipes on a second call', () => {
    setRecipes([makeRecipe('Pasta')]);
    setRecipes([makeRecipe('Tacos'), makeRecipe('Soup')]);
    expect(getStore().recipes).toHaveLength(2);
    expect(getStore().recipeBatchSizes).toEqual([2]);
  });
});

// ── appendRecipes ─────────────────────────────────────────────────────────────

describe('appendRecipes', () => {
  it('appends to existing recipes without replacing them', () => {
    setRecipes([makeRecipe('Pasta')]);
    appendRecipes([makeRecipe('Salad')]);
    expect(getStore().recipes).toHaveLength(2);
    expect(getStore().recipes[0].name).toBe('Pasta');
    expect(getStore().recipes[1].name).toBe('Salad');
  });

  it('adds a new entry to recipeBatchSizes', () => {
    setRecipes([makeRecipe('A'), makeRecipe('B')]);
    appendRecipes([makeRecipe('C'), makeRecipe('D'), makeRecipe('E')]);
    expect(getStore().recipeBatchSizes).toEqual([2, 3]);
  });

  it('assigns globally unique IDs across batches', () => {
    setRecipes([makeRecipe('A')]);
    appendRecipes([makeRecipe('B')]);
    const ids = getStore().recipes.map((r) => r.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('accumulates allShownRecipeNames across batches', () => {
    setRecipes([makeRecipe('Pasta')]);
    appendRecipes([makeRecipe('Salad')]);
    expect(getStore().allShownRecipeNames).toContain('Pasta');
    expect(getStore().allShownRecipeNames).toContain('Salad');
  });
});

// ── favorites ─────────────────────────────────────────────────────────────────

describe('isFavorite', () => {
  it('returns false when favorites list is empty', () => {
    expect(isFavorite('Pasta')).toBe(false);
  });

  it('returns true for a favorited recipe name', () => {
    addToFavorites(makeRecipe('Pasta'), 'uuid-1');
    expect(isFavorite('Pasta')).toBe(true);
  });

  it('returns false for an unfavorited recipe name', () => {
    addToFavorites(makeRecipe('Pasta'), 'uuid-1');
    expect(isFavorite('Salad')).toBe(false);
  });

  it('matches by name, not by the original recipe id', () => {
    const recipe = { ...makeRecipe('Pasta'), id: 'original-id' };
    addToFavorites(recipe, 'supabase-uuid');
    expect(isFavorite('Pasta')).toBe(true);
  });
});

describe('addToFavorites', () => {
  it('sets the recipe id to the supabase UUID', () => {
    addToFavorites(makeRecipe('Pasta'), 'supabase-uuid-123');
    const fav = getStore().favorites.find((r) => r.name === 'Pasta');
    expect(fav?.id).toBe('supabase-uuid-123');
  });

  it('prepends to the favorites list', () => {
    addToFavorites(makeRecipe('Pasta'), 'uuid-1');
    addToFavorites(makeRecipe('Salad'), 'uuid-2');
    expect(getStore().favorites[0].name).toBe('Salad');
  });
});

describe('removeFromFavorites', () => {
  it('removes a recipe by name', () => {
    addToFavorites(makeRecipe('Pasta'), 'uuid-1');
    addToFavorites(makeRecipe('Salad'), 'uuid-2');
    removeFromFavorites('Pasta');
    expect(isFavorite('Pasta')).toBe(false);
    expect(isFavorite('Salad')).toBe(true);
  });

  it('is a no-op when recipe is not in favorites', () => {
    addToFavorites(makeRecipe('Pasta'), 'uuid-1');
    removeFromFavorites('Salad');
    expect(getStore().favorites).toHaveLength(1);
  });
});

describe('setFavorites', () => {
  it('replaces the favorites list and sets supabase IDs', () => {
    addToFavorites(makeRecipe('OldRecipe'), 'old-id');
    setFavorites([
      { id: 'new-uuid-1', recipe: makeRecipe('Pasta') },
      { id: 'new-uuid-2', recipe: makeRecipe('Salad') },
    ]);
    const { favorites } = getStore();
    expect(favorites).toHaveLength(2);
    expect(favorites[0].id).toBe('new-uuid-1');
    expect(favorites[1].id).toBe('new-uuid-2');
    expect(isFavorite('OldRecipe')).toBe(false);
  });
});
