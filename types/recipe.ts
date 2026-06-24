export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
  notes?: string;
}

export interface Macros {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  prepTime: string;
  cookTime: string;
  totalTime: string;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  ingredients: Ingredient[];
  instructions: string[];
  tags: string[];
  macros: Macros;
}

export interface RecipeListResponse {
  recipes: Recipe[];
}
