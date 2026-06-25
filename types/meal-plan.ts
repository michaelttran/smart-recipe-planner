import { Ingredient, Macros } from './recipe';

export interface MealPlanRecipe {
  name: string;
  description: string;
  totalTime: string;
  difficulty: 'easy' | 'medium' | 'hard';
  ingredients: Ingredient[];
  instructions: string[];
  tags: string[];
  macros: Macros;
}

export interface DayPlan {
  day: string;
  recipe: MealPlanRecipe;
}

export interface ShoppingItem {
  name: string;
  amount: string;
  unit: string;
}

export interface WeeklyMealPlan {
  days: DayPlan[];
  shoppingList: ShoppingItem[];
}
