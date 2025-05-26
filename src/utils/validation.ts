// Validation utility functions for the fitness tracker app

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FoodData {
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

export interface CalculatorData {
  age: number;
  height: number;
  heightInches?: number;
  weight: number;
  gender: 'male' | 'female';
  unitSystem: 'imperial' | 'metric';
}

export interface GoalsData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// Food validation
export const validateFood = (food: FoodData): ValidationResult => {
  const errors: string[] = [];

  // Name validation
  if (!food.name.trim()) {
    errors.push('Food name is required');
  } else if (food.name.trim().length < 2) {
    errors.push('Food name must be at least 2 characters');
  } else if (food.name.trim().length > 100) {
    errors.push('Food name must be less than 100 characters');
  }

  // Calories validation
  const calories = parseFloat(food.calories);
  if (!food.calories.trim()) {
    errors.push('Calories value is required');
  } else if (isNaN(calories)) {
    errors.push('Calories must be a valid number');
  } else if (calories < 0) {
    errors.push('Calories cannot be negative');
  } else if (calories > 9000) {
    errors.push('Calories per 100g seems too high (max 9000)');
  }

  // Protein validation
  const protein = parseFloat(food.protein);
  if (!food.protein.trim()) {
    errors.push('Protein value is required');
  } else if (isNaN(protein)) {
    errors.push('Protein must be a valid number');
  } else if (protein < 0) {
    errors.push('Protein cannot be negative');
  } else if (protein > 100) {
    errors.push('Protein per 100g cannot exceed 100g');
  }

  // Carbs validation
  const carbs = parseFloat(food.carbs);
  if (!food.carbs.trim()) {
    errors.push('Carbs value is required');
  } else if (isNaN(carbs)) {
    errors.push('Carbs must be a valid number');
  } else if (carbs < 0) {
    errors.push('Carbs cannot be negative');
  } else if (carbs > 100) {
    errors.push('Carbs per 100g cannot exceed 100g');
  }

  // Fat validation
  const fat = parseFloat(food.fat);
  if (!food.fat.trim()) {
    errors.push('Fat value is required');
  } else if (isNaN(fat)) {
    errors.push('Fat must be a valid number');
  } else if (fat < 0) {
    errors.push('Fat cannot be negative');
  } else if (fat > 100) {
    errors.push('Fat per 100g cannot exceed 100g');
  }

  // Cross-validation: Check if macros add up reasonably
  if (!isNaN(protein) && !isNaN(carbs) && !isNaN(fat) && !isNaN(calories)) {
    const calculatedCalories = (protein * 4) + (carbs * 4) + (fat * 9);
    const difference = Math.abs(calories - calculatedCalories);
    const tolerance = calories * 0.2; // 20% tolerance
    
    if (difference > tolerance && calories > 50) {
      errors.push('Nutritional values don\'t match expected calorie calculation (check your values)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Portion size validation
export const validatePortionSize = (portionSize: string): ValidationResult => {
  const errors: string[] = [];
  const portion = parseFloat(portionSize);

  if (!portionSize.trim()) {
    errors.push('Portion size is required');
  } else if (isNaN(portion)) {
    errors.push('Portion size must be a valid number');
  } else if (portion <= 0) {
    errors.push('Portion size must be greater than 0');
  } else if (portion > 10000) {
    errors.push('Portion size seems too large (max 10,000g)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Calculator data validation
export const validateCalculatorData = (data: CalculatorData): ValidationResult => {
  const errors: string[] = [];

  // Age validation
  if (!data.age || isNaN(data.age)) {
    errors.push('Age is required');
  } else if (data.age < 15) {
    errors.push('Age must be at least 15 years');
  } else if (data.age > 80) {
    errors.push('Age must be 80 years or less');
  }

  // Height validation
  if (data.unitSystem === 'imperial') {
    // Imperial: feet and inches
    if (!data.height || isNaN(data.height)) {
      errors.push('Height (feet) is required');
    } else if (data.height < 3) {
      errors.push('Height must be at least 3 feet');
    } else if (data.height > 8) {
      errors.push('Height must be 8 feet or less');
    }
    
    if (data.heightInches !== undefined && (isNaN(data.heightInches) || data.heightInches < 0 || data.heightInches >= 12)) {
      errors.push('Height (inches) must be between 0 and 11');
    }
  } else {
    // Metric: centimeters
    if (!data.height || isNaN(data.height)) {
      errors.push('Height is required');
    } else if (data.height < 100) {
      errors.push('Height must be at least 100 cm');
    } else if (data.height > 250) {
      errors.push('Height must be 250 cm or less');
    }
  }

  // Weight validation
  if (data.unitSystem === 'imperial') {
    // Imperial: pounds
    if (!data.weight || isNaN(data.weight)) {
      errors.push('Weight is required');
    } else if (data.weight < 50) {
      errors.push('Weight must be at least 50 pounds');
    } else if (data.weight > 1000) {
      errors.push('Weight must be 1000 pounds or less');
    }
  } else {
    // Metric: kilograms
    if (!data.weight || isNaN(data.weight)) {
      errors.push('Weight is required');
    } else if (data.weight < 20) {
      errors.push('Weight must be at least 20 kg');
    } else if (data.weight > 450) {
      errors.push('Weight must be 450 kg or less');
    }
  }

  // Gender validation
  if (!data.gender || !['male', 'female'].includes(data.gender)) {
    errors.push('Gender selection is required');
  }

  // Unit system validation
  if (!data.unitSystem || !['imperial', 'metric'].includes(data.unitSystem)) {
    errors.push('Unit system selection is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Goals validation
export const validateGoals = (goals: GoalsData): ValidationResult => {
  const errors: string[] = [];

  // Calories validation
  if (!goals.calories || isNaN(goals.calories)) {
    errors.push('Calorie goal is required');
  } else if (goals.calories < 800) {
    errors.push('Calorie goal should be at least 800 for safety');
  } else if (goals.calories > 10000) {
    errors.push('Calorie goal seems too high (max 10,000)');
  }

  // Protein validation
  if (!goals.protein || isNaN(goals.protein)) {
    errors.push('Protein goal is required');
  } else if (goals.protein < 10) {
    errors.push('Protein goal should be at least 10g');
  } else if (goals.protein > 500) {
    errors.push('Protein goal seems too high (max 500g)');
  }

  // Carbs validation
  if (!goals.carbs || isNaN(goals.carbs)) {
    errors.push('Carbs goal is required');
  } else if (goals.carbs < 0) {
    errors.push('Carbs goal cannot be negative');
  } else if (goals.carbs > 1000) {
    errors.push('Carbs goal seems too high (max 1000g)');
  }

  // Fat validation
  if (!goals.fat || isNaN(goals.fat)) {
    errors.push('Fat goal is required');
  } else if (goals.fat < 10) {
    errors.push('Fat goal should be at least 10g for essential fatty acids');
  } else if (goals.fat > 300) {
    errors.push('Fat goal seems too high (max 300g)');
  }

  // Cross-validation: Check if macros match calories reasonably
  if (goals.calories && goals.protein && goals.carbs && goals.fat) {
    const calculatedCalories = (goals.protein * 4) + (goals.carbs * 4) + (goals.fat * 9);
    const difference = Math.abs(goals.calories - calculatedCalories);
    const tolerance = goals.calories * 0.15; // 15% tolerance
    
    if (difference > tolerance) {
      errors.push('Macro goals don\'t match calorie goal. Consider adjusting your values.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Utility function to sanitize string inputs
export const sanitizeString = (input: string): string => {
  return input.trim().replace(/[<>'"&]/g, (match) => {
    const escapeMap: { [key: string]: string } = {
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '&': '&amp;'
    };
    return escapeMap[match] || match;
  });
};

// Utility function to format validation errors for display
export const formatValidationErrors = (errors: string[]): string => {
  if (errors.length === 0) return '';
  if (errors.length === 1) return errors[0];
  return errors.join('. ');
};

// Utility function to check if a value is a valid number (not NaN, null, undefined, or Infinity)
export const isValidNumber = (value: any): boolean => {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

// Utility function to safely convert a value to a number with fallback
export const safeNumber = (value: any, fallback: number = 0): number => {
  const num = Number(value);
  return isValidNumber(num) ? num : fallback;
}; 