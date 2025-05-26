export interface Food {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
  unit?: 'g' | 'ml';
  isCustom?: boolean;
}

export interface DailyEntry {
  id: number;
  foodId: number;
  name: string;
  servings: number;
  portionSize: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  date: string;
  mealTime: string;
} 