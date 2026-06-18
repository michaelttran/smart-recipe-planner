export type TimeAvailable = 'quick' | 'medium' | 'leisurely';

export interface UserPreferences {
  timeAvailable: TimeAvailable;
  useAllIngredients: boolean;
  mealType: string | null;
  flavorProfiles: string[];
  dietaryNeeds: string[];
  cuisineTypes: string[];
  extraIngredients: string;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  timeAvailable: 'medium',
  useAllIngredients: false,
  mealType: null,
  flavorProfiles: [],
  dietaryNeeds: [],
  cuisineTypes: [],
  extraIngredients: '',
};
