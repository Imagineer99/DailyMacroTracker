import React, { useState, useEffect } from 'react';
import { Plus, Search, Target, Calendar, User, Home, BarChart3, Apple, Utensils, Edit3, Trash2, Save, X, ChevronRight, UserPlus, LogOut, AlertCircle } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthForm from './components/AuthForm';
import DataCleanup from './components/DataCleanup';
import { api } from './utils/api';
import { 
  validateFood, 
  validatePortionSize, 
  validateCalculatorData, 
  validateGoals, 
  sanitizeString, 
  type FoodData,
} from './utils/validation';

// Define interfaces
interface Food {
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

interface DailyEntry {
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

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading your nutrition tracker...</p>
    </div>
  </div>
);

const MacroTracker = () => {
  const { user, logout, isAuthenticated } = useAuth();
  
  // Utility function to safely display numeric values, showing '0' instead of NaN
  const safeDisplayValue = (value: number | string, decimals: number = 0): string => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '0';
    return numValue.toFixed(decimals);
  };
  const [activeTab, setActiveTab] = useState('dashboard');
  const [foods] = useState<Food[]>([
    { id: 1, name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, serving: '100g' },
    { id: 2, name: 'Brown Rice', calories: 111, protein: 2.6, carbs: 23, fat: 0.9, serving: '100g' },
    { id: 3, name: 'Avocado', calories: 160, protein: 2, carbs: 9, fat: 15, serving: '100g' },
    { id: 4, name: 'Eggs', calories: 155, protein: 13, carbs: 1.1, fat: 11, serving: '100g' },
    { id: 5, name: 'Oatmeal', calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9, serving: '100g' },
    { id: 6, name: 'Salmon', calories: 208, protein: 20, carbs: 0, fat: 12, serving: '100g' },
    { id: 7, name: 'Greek Yogurt', calories: 59, protein: 10, carbs: 3.6, fat: 0.4, serving: '100g' },
    { id: 8, name: 'Sweet Potato', calories: 86, protein: 1.6, carbs: 20, fat: 0.1, serving: '100g' },
  ]);
  
  // Custom foods state
  const [customFoods, setCustomFoods] = useState<Food[]>([]);
  const [showAddFoodForm, setShowAddFoodForm] = useState(false);
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [newFood, setNewFood] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    serving: '100',
    unit: 'g' as 'g' | 'ml'
  });
  
  // State for portion selection when adding food to diary
  const [showPortionModal, setShowPortionModal] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [portionSize, setPortionSize] = useState('100');
  
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]);
  const [goals, setGoals] = useState({
    calories: 2200,
    protein: 165,
    carbs: 275,
    fat: 73
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingGoals, setEditingGoals] = useState(false);
  const [newGoals, setNewGoals] = useState(goals);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorData, setCalculatorData] = useState({
    age: 25,
    gender: 'male' as 'male' | 'female',
    height: 5.83,
    weight: 165,
    activityLevel: 'moderate' as keyof typeof activityMultipliers
  });
  const [calculatorResults, setCalculatorResults] = useState<{
    maintenance: number;
    mildLoss: number;
    weightLoss: number;
    extremeLoss: number;
  } | null>(null);

  // Validation states
  const [foodValidationErrors, setFoodValidationErrors] = useState<string[]>([]);
  const [portionValidationErrors, setPortionValidationErrors] = useState<string[]>([]);
  const [calculatorValidationErrors, setCalculatorValidationErrors] = useState<string[]>([]);
  const [goalsValidationErrors, setGoalsValidationErrors] = useState<string[]>([]);
  const [isDeletingEntry, setIsDeletingEntry] = useState(false);
  const [isManualSaving, setIsManualSaving] = useState(false);

  // Activity multipliers for calorie calculation
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    veryActive: 1.9
  };

  // Function to clean up NaN values in daily entries
  const cleanupNaNEntries = (entries: DailyEntry[]): DailyEntry[] => {
    return entries.filter(entry => {
      // Remove entries with NaN values
      if (isNaN(entry.calories) || isNaN(entry.protein) || isNaN(entry.carbs) || isNaN(entry.fat)) {
        console.warn('Removing entry with NaN values:', entry);
        return false;
      }
      return true;
    });
  };

  // Function to count corrupted entries
  const countCorruptedEntries = (): number => {
    return dailyEntries.filter(entry => 
      isNaN(entry.calories) || isNaN(entry.protein) || isNaN(entry.carbs) || isNaN(entry.fat)
    ).length;
  };

  // Function to manually clean up corrupted entries
  const manualCleanupCorruptedEntries = () => {
    const cleanEntries = cleanupNaNEntries(dailyEntries);
    setDailyEntries(cleanEntries);
    
    // Save the cleaned data
    if (isAuthenticated) {
      saveUserDataToBackend();
    } else {
      localStorage.setItem('dailyEntries', JSON.stringify(cleanEntries));
    }
  };

  // Load user data from backend on authentication
  useEffect(() => {
    if (isAuthenticated) {
      loadUserDataFromBackend();
    }
  }, [isAuthenticated]);

  // Load user data from backend
  const loadUserDataFromBackend = async () => {
    try {
      const response = await api.getUserData();
      if (response.success && response.data) {
        const userData = response.data;
        setCustomFoods(userData.customFoods || []);
        
        // Clean up any NaN entries before setting state
        const cleanEntries = cleanupNaNEntries(userData.dailyEntries || []);
        setDailyEntries(cleanEntries);
        
        // If we removed any entries, save the cleaned data back
        if (cleanEntries.length !== (userData.dailyEntries || []).length) {
          console.log('Cleaned up NaN entries, saving corrected data');
          setTimeout(() => saveUserDataToBackend(), 1000);
        }
        
        setGoals(userData.goals || { calories: 2200, protein: 165, carbs: 275, fat: 73 });
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  // Save user data to backend
  const saveUserDataToBackend = async (overrideData?: { customFoods?: any[], dailyEntries?: any[], goals?: any }) => {
    try {
      const userData = {
        customFoods: overrideData?.customFoods ?? customFoods,
        dailyEntries: overrideData?.dailyEntries ?? dailyEntries,
        goals: overrideData?.goals ?? goals
      };
      await api.saveUserData(userData);
    } catch (error) {
      console.error('Failed to save user data:', error);
      throw error; // Re-throw to allow caller to handle
    }
  };

  // Auto-save to backend when data changes
  useEffect(() => {
    if (isAuthenticated && (customFoods.length > 0 || dailyEntries.length > 0) && !isDeletingEntry && !isManualSaving) {
      const timeoutId = setTimeout(() => {
        saveUserDataToBackend();
      }, 1000); // Debounce saves by 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [customFoods, dailyEntries, goals, isAuthenticated, isDeletingEntry, isManualSaving]);

  // Legacy localStorage for backward compatibility (remove these after migration)
  useEffect(() => {
    if (!isAuthenticated) {
      const savedCustomFoods = localStorage.getItem('customFoods');
      if (savedCustomFoods) {
        setCustomFoods(JSON.parse(savedCustomFoods));
      }
      
      const savedEntries = localStorage.getItem('dailyEntries');
      if (savedEntries) {
        const parsedEntries = JSON.parse(savedEntries);
        const cleanEntries = cleanupNaNEntries(parsedEntries);
        setDailyEntries(cleanEntries);
        
        // If we cleaned up entries, save the corrected data back to localStorage
        if (cleanEntries.length !== parsedEntries.length) {
          console.log('Cleaned up NaN entries in localStorage');
          localStorage.setItem('dailyEntries', JSON.stringify(cleanEntries));
        }
      }
    }
  }, [isAuthenticated]);

  // Save custom foods to localStorage whenever customFoods changes (legacy)
  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem('customFoods', JSON.stringify(customFoods));
    }
  }, [customFoods, isAuthenticated]);

  // Save daily entries to localStorage (legacy)
  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem('dailyEntries', JSON.stringify(dailyEntries));
    }
  }, [dailyEntries, isAuthenticated]);

  // Custom food management functions
  const addCustomFood = () => {
    // Validate food data
    const foodData: FoodData = {
      name: sanitizeString(newFood.name),
      calories: newFood.calories,
      protein: newFood.protein,
      carbs: newFood.carbs,
      fat: newFood.fat
    };

    const validation = validateFood(foodData);
    if (!validation.isValid) {
      setFoodValidationErrors(validation.errors);
      return;
    }

    // Clear validation errors if validation passes
    setFoodValidationErrors([]);

    const caloriesPer100g = parseFloat(newFood.calories);
    const proteinPer100g = parseFloat(newFood.protein);
    const carbsPer100g = parseFloat(newFood.carbs);
    const fatPer100g = parseFloat(newFood.fat);

    // Store values per 100g/100ml to be consistent with built-in foods
    const customFood: Food = {
      id: Date.now(),
      name: sanitizeString(newFood.name),
      calories: caloriesPer100g,
      protein: proteinPer100g,
      carbs: carbsPer100g,
      fat: fatPer100g,
      serving: `100${newFood.unit}`,
      unit: newFood.unit,
      isCustom: true
    };

    setCustomFoods([...customFoods, customFood]);
    setNewFood({ name: '', calories: '', protein: '', carbs: '', fat: '', serving: '100', unit: 'g' });
    setShowAddFoodForm(false);
  };

  const updateCustomFood = () => {
    if (!editingFood) return;

    // Validate food data
    const foodData: FoodData = {
      name: sanitizeString(newFood.name),
      calories: newFood.calories,
      protein: newFood.protein,
      carbs: newFood.carbs,
      fat: newFood.fat
    };

    const validation = validateFood(foodData);
    if (!validation.isValid) {
      setFoodValidationErrors(validation.errors);
      return;
    }

    // Clear validation errors if validation passes
    setFoodValidationErrors([]);

    const caloriesPer100g = parseFloat(newFood.calories);
    const proteinPer100g = parseFloat(newFood.protein);
    const carbsPer100g = parseFloat(newFood.carbs);
    const fatPer100g = parseFloat(newFood.fat);

    const updatedFood: Food = {
      ...editingFood,
      name: sanitizeString(newFood.name),
      calories: caloriesPer100g,
      protein: proteinPer100g,
      carbs: carbsPer100g,
      fat: fatPer100g,
      serving: `100${newFood.unit}`,
      unit: newFood.unit,
    };

    setCustomFoods(customFoods.map(food => 
      food.id === editingFood.id ? updatedFood : food
    ));
    setEditingFood(null);
    setNewFood({ name: '', calories: '', protein: '', carbs: '', fat: '', serving: '100', unit: 'g' });
    setShowAddFoodForm(false);
  };

  const deleteCustomFood = (foodId: number) => {
    setCustomFoods(customFoods.filter(food => food.id !== foodId));
  };

  const startEditingFood = (food: Food) => {
    setEditingFood(food);
    // Values are already per 100g/100ml, so just use them directly
    setNewFood({
      name: food.name,
      calories: food.calories.toString(),
      protein: food.protein.toString(),
      carbs: food.carbs.toString(),
      fat: food.fat.toString(),
      serving: '100',
      unit: food.unit || 'g'
    });
    setShowAddFoodForm(true);
  };

  const cancelFoodForm = () => {
    setShowAddFoodForm(false);
    setEditingFood(null);
    setNewFood({ name: '', calories: '', protein: '', carbs: '', fat: '', serving: '100', unit: 'g' });
    setFoodValidationErrors([]);
  };

  // Calculate daily totals with NaN protection
  const dailyTotals = dailyEntries
    .filter(entry => entry.date === selectedDate)
    .reduce((totals, entry) => {
      // Protect against NaN values in entries
      const safeCalories = isNaN(entry.calories) ? 0 : entry.calories;
      const safeProtein = isNaN(entry.protein) ? 0 : entry.protein;
      const safeCarbs = isNaN(entry.carbs) ? 0 : entry.carbs;
      const safeFat = isNaN(entry.fat) ? 0 : entry.fat;
      
      return {
        calories: totals.calories + safeCalories,
        protein: totals.protein + safeProtein,
        carbs: totals.carbs + safeCarbs,
        fat: totals.fat + safeFat
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const openPortionModal = (food: Food) => {
    setSelectedFood(food);
    setPortionSize('100');
    setShowPortionModal(true);
  };

  const addFoodEntry = async (food: Food, customPortionSize?: number) => {
    let actualPortionSize: number;
    
    // Handle portion size validation and parsing
    if (customPortionSize !== undefined) {
      actualPortionSize = customPortionSize;
    } else {
      // Validate portion size from modal input
      const validation = validatePortionSize(portionSize);
      if (!validation.isValid) {
        setPortionValidationErrors(validation.errors);
        return;
      }
      setPortionValidationErrors([]);
      
      // Parse and validate the portion size
      actualPortionSize = parseFloat(portionSize);
      if (isNaN(actualPortionSize) || actualPortionSize <= 0) {
        setPortionValidationErrors(['Invalid portion size']);
        return;
      }
    }
    
    // Validate food data to prevent NaN values
    if (!food || typeof food.calories !== 'number' || typeof food.protein !== 'number' || 
        typeof food.carbs !== 'number' || typeof food.fat !== 'number') {
      console.error('Invalid food data:', food);
      return;
    }
    
    // Additional safety checks for NaN values
    if (isNaN(food.calories) || isNaN(food.protein) || isNaN(food.carbs) || isNaN(food.fat)) {
      console.error('Food contains NaN values:', food);
      return;
    }
    
    const basePortionSize = parseFloat(food.serving.replace(/[^\d.]/g, '')) || 100;
    const multiplier = actualPortionSize / basePortionSize;
    
    // Validate multiplier
    if (isNaN(multiplier) || multiplier <= 0) {
      console.error('Invalid multiplier calculated:', multiplier);
      return;
    }
    
    // Calculate nutritional values with safety checks
    const calculatedCalories = food.calories * multiplier;
    const calculatedProtein = food.protein * multiplier;
    const calculatedCarbs = food.carbs * multiplier;
    const calculatedFat = food.fat * multiplier;
    
    // Final NaN check before creating entry
    if (isNaN(calculatedCalories) || isNaN(calculatedProtein) || isNaN(calculatedCarbs) || isNaN(calculatedFat)) {
      console.error('Calculated values contain NaN:', {
        calories: calculatedCalories,
        protein: calculatedProtein,
        carbs: calculatedCarbs,
        fat: calculatedFat
      });
      return;
    }
    
    const entry: DailyEntry = {
      id: Date.now(), // Temporary ID for optimistic updates
      foodId: food.id,
      name: food.name,
      servings: 1,
      portionSize: actualPortionSize,
      unit: food.unit || 'g',
      calories: calculatedCalories,
      protein: calculatedProtein,
      carbs: calculatedCarbs,
      fat: calculatedFat,
      date: selectedDate,
      mealTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    // Store original entries for potential rollback
    const originalEntries = [...dailyEntries];
    const updatedEntries = [...dailyEntries, entry];
  
    
    // Optimistically update the UI
    setDailyEntries(updatedEntries);
    setShowPortionModal(false);
    setSelectedFood(null);
    setPortionSize('100');
    
    // If authenticated, save to backend and reload to get proper IDs
    if (isAuthenticated) {
      try {
        setIsManualSaving(true);
        await saveUserDataToBackend({ dailyEntries: updatedEntries });
        // Reload data to get the correct database IDs
        await loadUserDataFromBackend();
      } catch (error) {
        console.error('Failed to save entry to backend:', error);
        // Revert the optimistic update on error
        setDailyEntries(originalEntries);
      } finally {
        setIsManualSaving(false);
      }
    }
  };

  const removeFoodEntry = async (entryId: number) => {
    // Store the original entries for potential rollback
    const originalEntries = [...dailyEntries];
    
    try {
      // Set flag to prevent auto-save during deletion
      setIsDeletingEntry(true);
      
      // Find the entry to be deleted for logging
      const entryToDelete = dailyEntries.find(entry => entry.id === entryId);
      console.log('Attempting to delete entry:', entryToDelete);
      
      if (!entryToDelete) {
        console.error('Entry not found in local state:', entryId);
        alert('Entry not found. Please refresh the page and try again.');
        setIsDeletingEntry(false);
        return;
      }
      
      // Update local state with filtered entries
      const updatedEntries = dailyEntries.filter(entry => entry.id !== entryId);
      setDailyEntries(updatedEntries);
      
      // If authenticated, use the full save approach since individual delete may fail due to ID mismatch
      if (isAuthenticated) {
        console.log('User is authenticated, saving updated entries to backend...');
        
        try {
          setIsManualSaving(true);
          // Use the full save approach which replaces all entries
          await saveUserDataToBackend({ dailyEntries: updatedEntries });
          
          console.log('Entry deleted successfully via full save method');
          
          // Reload data to ensure we have the correct IDs from the database
          await loadUserDataFromBackend();
        } catch (saveError) {
          console.error('Failed to save updated entries:', saveError);
          // Revert the deletion if save failed
          setDailyEntries(originalEntries);
          alert(`Failed to delete entry: ${saveError || 'Unknown error'}. Please try again.`);
          setIsDeletingEntry(false);
          return;
        } finally {
          setIsManualSaving(false);
        }
      } else {
        console.log('User not authenticated, deletion only applied locally');
      }
      
      console.log('Food entry deleted successfully');
    } catch (error) {
      console.error('Error removing food entry:', error);
      // Revert the deletion on error
      setDailyEntries(originalEntries);
      alert('Error deleting entry. Please try again.');
    } finally {
      // Always clear the deletion flag
      setIsDeletingEntry(false);
    }
  };

  const updateGoals = () => {
    // Validate goals data
    const validation = validateGoals(newGoals);
    if (!validation.isValid) {
      setGoalsValidationErrors(validation.errors);
      return;
    }
    
    // Clear validation errors if validation passes
    setGoalsValidationErrors([]);
    
    setGoals(newGoals);
    setEditingGoals(false);
  };

  const calculateCalories = () => {
    // Validate calculator data
    const validation = validateCalculatorData(calculatorData);
    if (!validation.isValid) {
      setCalculatorValidationErrors(validation.errors);
      return;
    }
    
    // Clear validation errors if validation passes
    setCalculatorValidationErrors([]);
    
    // Mifflin-St Jeor Equation
    let bmr;
    const heightInCm = calculatorData.height * 30.48; // convert feet to cm
    const weightInKg = calculatorData.weight * 0.453592; // convert lbs to kg
    
    if (calculatorData.gender === 'male') {
      bmr = 10 * weightInKg + 6.25 * heightInCm - 5 * calculatorData.age + 5;
    } else {
      bmr = 10 * weightInKg + 6.25 * heightInCm - 5 * calculatorData.age - 161;
    }

    const maintenance = Math.round(bmr * activityMultipliers[calculatorData.activityLevel]);
    
    const results = {
      maintenance: maintenance,
      mildLoss: Math.round(maintenance * 0.9), // 10% deficit
      weightLoss: Math.round(maintenance * 0.8), // 20% deficit
      extremeLoss: Math.round(maintenance * 0.61) // 39% deficit
    };

    setCalculatorResults(results);
  };

  const applyCalculatedGoals = (calorieTarget: number) => {
    // Calculate macros based on standard ratios
    const protein = Math.round(calculatorData.weight * 1); // 1g per lb bodyweight
    const fat = Math.round(calorieTarget * 0.25 / 9); // 25% of calories from fat
    const carbs = Math.round((calorieTarget - (protein * 4) - (fat * 9)) / 4); // remaining calories from carbs
    
    const newTargets = {
      calories: calorieTarget,
      protein: protein,
      carbs: Math.max(carbs, 50), // minimum 50g carbs
      fat: fat
    };
    
    setGoals(newTargets);
    setCalculatorResults(null);
    setShowCalculator(false);
  };

  const MacroProgressBar = ({ label, current, goal, unit = 'g', gradient }: {
    label: string;
    current: number;
    goal: number;
    unit?: string;
    gradient: string;
  }) => {
    // Protect against NaN values
    const safeCurrent = isNaN(current) ? 0 : current;
    const safeGoal = isNaN(goal) ? 1 : goal;
    
    const percentage = Math.min((safeCurrent / safeGoal) * 100, 100);
    const remaining = Math.max(safeGoal - safeCurrent, 0);
    const isComplete = percentage >= 100;
    
    return (
      <div className="bg-white border border-gray-100 rounded-lg p-6 hover:border-gray-200 transition-colors">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">{label}</h3>
            <div className="mt-1">
              <span className="text-2xl font-light text-gray-900">{safeCurrent.toFixed(0)}</span>
              <span className="text-sm text-gray-500 ml-1">/ {safeGoal}{unit}</span>
            </div>
          </div>
          <div className={`text-xs font-medium px-2 py-1 rounded ${
            isComplete ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'
          }`}>
            {percentage.toFixed(0)}%
          </div>
        </div>
        
        <div className="relative">
          <div className="bg-gray-100 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full transition-all duration-700 ease-out ${gradient}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {remaining.toFixed(0)}{unit} remaining
          </div>
        </div>
      </div>
    );
  };

  const FoodCard = ({ food, onAdd, onEdit, onDelete, isCustom = false }: {
    food: Food;
    onAdd: (food: Food) => Promise<void>;
    onEdit?: (food: Food) => void;
    onDelete?: (foodId: number) => void;
    isCustom?: boolean;
  }) => (
    <div className="bg-white border border-gray-100 rounded-lg p-5 hover:border-gray-200 hover:shadow-sm transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-gray-900">{food.name}</h3>
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Per {food.serving}</p>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isCustom && onEdit && onDelete && (
            <>
              <button
                onClick={() => onEdit(food)}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 transition-all duration-200"
                title="Edit food"
              >
                <Edit3 size={12} />
              </button>
              <button
                onClick={() => onDelete(food.id)}
                className="bg-red-600 hover:bg-red-700 text-white rounded-full p-2 transition-all duration-200"
                title="Delete food"
              >
                <Trash2 size={12} />
              </button>
            </>
          )}
          <button
            onClick={() => openPortionModal(food)}
            className="bg-gray-900 hover:bg-gray-800 text-white rounded-full p-2 transition-all duration-200"
            title="Add to diary"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Calories</span>
          <span className="font-medium text-gray-900">{safeDisplayValue(food.calories)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Protein</span>
          <span className="font-medium text-gray-900">{safeDisplayValue(food.protein, 1)}g</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Carbs</span>
          <span className="font-medium text-gray-900">{safeDisplayValue(food.carbs, 1)}g</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Fat</span>
          <span className="font-medium text-gray-900">{safeDisplayValue(food.fat, 1)}g</span>
        </div>
      </div>
    </div>
  );

  // Combine and filter foods
  const allFoods = [...foods, ...customFoods];
  const filteredFoods = allFoods.filter(food =>
    food.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separate built-in and custom foods for display
  const filteredBuiltInFoods = foods.filter(food =>
    food.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredCustomFoods = customFoods.filter(food =>
    food.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const todaysEntries = dailyEntries.filter(entry => entry.date === selectedDate);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

    return (    <div className="min-h-screen bg-gray-50">      {/* Header */}      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">          <div className="flex items-center justify-between">            <div className="flex items-center gap-3 sm:gap-4">              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">                <Target className="text-white" size={18} />              </div>              <h1 className="text-lg sm:text-xl font-light text-gray-900 tracking-tight">                Nutrition Tracker              </h1>            </div>                        <div className="flex items-center gap-2 sm:gap-6">
              {/* User Info */}
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
                <User size={16} />
                <span>Welcome, <span className="font-medium text-gray-900">{user?.username}</span></span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={16} />
                <span>{formatDate(selectedDate)}</span>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-sm border border-gray-200 rounded-md px-2 sm:px-3 py-2 focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none w-32 sm:w-auto"
              />
              <button
                onClick={logout}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>        </div>      </header>      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
                {/* Navigation */}        <nav className="mb-6 sm:mb-10 bg-white border border-gray-200 rounded-lg p-1">          <div className="grid grid-cols-2 sm:flex gap-1">            {[              { id: 'dashboard', label: 'Overview', icon: Home },              { id: 'add-food', label: 'Add Food', icon: Plus },              { id: 'history', label: 'Analytics', icon: BarChart3 },              { id: 'goals', label: 'Goals', icon: Target }            ].map(tab => {              const Icon = tab.icon;              return (                <button                  key={tab.id}                  onClick={() => setActiveTab(tab.id)}                  className={`flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-6 py-3 rounded-lg text-xs sm:text-sm font-medium transition-all ${                    activeTab === tab.id                      ? 'bg-gray-900 text-white'                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'                  }`}                >                  <Icon size={16} />                  <span className="hidden sm:inline">{tab.label}</span>                  <span className="sm:hidden text-xs">{tab.label.split(' ')[0]}</span>                </button>              );            })}          </div>        </nav>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Data Cleanup Warning */}
            <DataCleanup 
              corruptedEntries={countCorruptedEntries()} 
              onCleanup={manualCleanupCorruptedEntries}
            />
            
                        {/* Daily Overview */}            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">              <MacroProgressBar                label="Calories"                current={dailyTotals.calories}                goal={goals.calories}                unit=""                gradient="bg-gradient-to-r from-orange-400 to-red-500"              />              <MacroProgressBar                label="Protein"                current={dailyTotals.protein}                goal={goals.protein}                gradient="bg-gradient-to-r from-blue-400 to-blue-600"              />              <MacroProgressBar                label="Carbs"                current={dailyTotals.carbs}                goal={goals.carbs}                gradient="bg-gradient-to-r from-green-400 to-emerald-600"              />              <MacroProgressBar                label="Fat"                current={dailyTotals.fat}                goal={goals.fat}                gradient="bg-gradient-to-r from-purple-400 to-purple-600"              />            </div>

            {/* Meals Summary */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-medium text-gray-900">Food Log</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {todaysEntries.length} item{todaysEntries.length !== 1 ? 's' : ''} logged
                </p>
              </div>
              
              <div className="divide-y divide-gray-100">
                {todaysEntries.length === 0 ? (
                  <div className="p-12 text-center">
                    <Utensils className="mx-auto text-gray-300 mb-4" size={32} />
                    <p className="text-gray-500 text-sm">No meals logged for {formatDate(selectedDate)}</p>
                    <button
                      onClick={() => setActiveTab('add-food')}
                      className="mt-4 text-sm text-gray-900 hover:text-gray-700 font-medium inline-flex items-center gap-1"
                    >
                      Add your first meal <ChevronRight size={14} />
                    </button>
                  </div>
                ) : (
                  todaysEntries.map(entry => {
                    const hasNaN = isNaN(entry.calories) || isNaN(entry.protein) || isNaN(entry.carbs) || isNaN(entry.fat);
                    
                    return (
                      <div key={entry.id} className={`p-6 hover:bg-gray-50 transition-colors group ${hasNaN ? 'bg-red-50 border-l-4 border-red-400' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900">{entry.name}</h3>
                              {hasNaN && (
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                  Corrupted Data
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {entry.portionSize}{entry.unit} • Added at {entry.mealTime}
                            </p>
                            <div className="flex gap-6 text-xs text-gray-500 mt-2">
                              <span>{safeDisplayValue(entry.calories)} cal</span>
                              <span>{safeDisplayValue(entry.protein, 1)}g protein</span>
                              <span>{safeDisplayValue(entry.carbs, 1)}g carbs</span>
                              <span>{safeDisplayValue(entry.fat, 1)}g fat</span>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFoodEntry(entry.id)}
                            className={`opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-2 transition-all ${hasNaN ? 'opacity-100' : ''}`}
                            title={hasNaN ? 'Remove corrupted entry' : 'Remove entry'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add Food Tab */}
        {activeTab === 'add-food' && (
          <div className="space-y-8">
                        {/* Search and Add Custom Food Header */}            <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">                <div className="relative flex-1">                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />                  <input                    type="text"                    placeholder="Search food database..."                    value={searchTerm}                    onChange={(e) => setSearchTerm(e.target.value)}                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none text-sm"                  />                </div>                <button                  onClick={() => setShowAddFoodForm(true)}                  className="px-4 sm:px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"                >                  <UserPlus size={16} />                  <span className="hidden sm:inline">Add Custom Food</span>                  <span className="sm:hidden">Add Food</span>                </button>              </div>            </div>

            {/* Add/Edit Custom Food Form */}
            {showAddFoodForm && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    {editingFood ? 'Edit Food' : 'Add Custom Food'}
                  </h3>
                  <button
                    onClick={cancelFoodForm}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Food Name
                    </label>
                    <input
                      type="text"
                      value={newFood.name}
                      onChange={(e) => setNewFood({...newFood, name: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none text-sm"
                      placeholder="e.g., Chicken Breast"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit
                    </label>
                    <select
                      value={newFood.unit}
                      onChange={(e) => setNewFood({...newFood, unit: e.target.value as 'g' | 'ml'})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none text-sm"
                    >
                      <option value="g">grams</option>
                      <option value="ml">ml</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      All nutrition values will be stored per 100{newFood.unit}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Calories per 100g
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={newFood.calories}
                      onChange={(e) => setNewFood({...newFood, calories: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none text-sm"
                      placeholder="165"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Protein per 100g (g)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={newFood.protein}
                      onChange={(e) => setNewFood({...newFood, protein: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none text-sm"
                      placeholder="31"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Carbs per 100g (g)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={newFood.carbs}
                      onChange={(e) => setNewFood({...newFood, carbs: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none text-sm"
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fat per 100g (g)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={newFood.fat}
                      onChange={(e) => setNewFood({...newFood, fat: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none text-sm"
                      placeholder="3.6"
                    />
                  </div>
                  
                  {/* Nutrition Preview per 100g */}
                  {(newFood.calories || newFood.protein || newFood.carbs || newFood.fat) && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Nutrition per 100{newFood.unit}</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Calories</span>
                          <span className="font-medium text-gray-900">{safeDisplayValue(newFood.calories)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Protein</span>
                          <span className="font-medium text-gray-900">{safeDisplayValue(newFood.protein, 1)}g</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Carbs</span>
                          <span className="font-medium text-gray-900">{safeDisplayValue(newFood.carbs, 1)}g</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Fat</span>
                          <span className="font-medium text-gray-900">{safeDisplayValue(newFood.fat, 1)}g</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Validation Errors */}
                {foodValidationErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                      <div className="text-sm text-red-600">
                        <p className="font-medium mb-1">Please fix the following errors:</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {foodValidationErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-3 pt-6">
                  <button
                    onClick={editingFood ? updateCustomFood : addCustomFood}
                    className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2"
                  >
                    <Save size={16} />
                    {editingFood ? 'Update Food' : 'Add Food'}
                  </button>
                  <button
                    onClick={cancelFoodForm}
                    className="px-6 py-3 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Portion Selection Modal */}
            {showPortionModal && selectedFood && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-medium text-gray-900">
                      Add {selectedFood.name}
                    </h3>
                    <button
                      onClick={() => setShowPortionModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Portion Size ({selectedFood.unit || 'g'})
                      </label>
                      <input
                        type="number"
                        value={portionSize}
                        onChange={(e) => setPortionSize(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none text-sm"
                        placeholder="100"
                        min="1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Nutrition values are per {selectedFood.serving}
                      </p>
                    </div>
                    
                    {/* Preview nutritional values */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Nutritional Preview</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {(() => {
                          const basePortionSize = parseFloat(selectedFood.serving.replace(/[^\d.]/g, '')) || 100;
                          const inputPortionSize = parseFloat(portionSize) || 0;
                          const multiplier = inputPortionSize / basePortionSize;
                          
                          // Helper function to safely calculate and format values
                          const safeCalculate = (value: number, decimals: number = 1): string => {
                            if (isNaN(value) || isNaN(multiplier) || multiplier < 0) {
                              return '0';
                            }
                            const result = value * multiplier;
                            return isNaN(result) ? '0' : result.toFixed(decimals);
                          };
                          
                          return (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Calories</span>
                                <span className="font-medium text-gray-900">{safeCalculate(selectedFood.calories, 0)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Protein</span>
                                <span className="font-medium text-gray-900">{safeCalculate(selectedFood.protein)}g</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Carbs</span>
                                <span className="font-medium text-gray-900">{safeCalculate(selectedFood.carbs)}g</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Fat</span>
                                <span className="font-medium text-gray-900">{safeCalculate(selectedFood.fat)}g</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Validation Errors */}
                  {portionValidationErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-start">
                        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                        <div className="text-sm text-red-600">
                          <p className="font-medium mb-1">Please fix the following:</p>
                          <ul className="list-disc list-inside space-y-0.5">
                            {portionValidationErrors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-3 pt-6">
                    <button
                      onClick={() => {
                        if (selectedFood) {
                          addFoodEntry(selectedFood, parseFloat(portionSize));
                        }
                      }}
                      className="flex-1 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      Add to Diary
                    </button>
                    <button
                      onClick={() => {
                        setShowPortionModal(false);
                        setPortionValidationErrors([]);
                      }}
                      className="px-6 py-3 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* My Foods Section */}
            {!showAddFoodForm && filteredCustomFoods.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <UserPlus className="text-blue-600" size={20} />
                  <h2 className="text-lg font-medium text-gray-900">My Foods</h2>
                  <span className="text-sm text-gray-500">({filteredCustomFoods.length})</span>
                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">                  {filteredCustomFoods.map(food => (                    <FoodCard                      key={food.id}                      food={food}                      onAdd={addFoodEntry}                      onEdit={startEditingFood}                      onDelete={deleteCustomFood}                      isCustom={true}                    />                  ))}                </div>
              </div>
            )}

            {/* Built-in Foods Section */}
            {!showAddFoodForm && (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <Apple className="text-green-600" size={20} />
                  <h2 className="text-lg font-medium text-gray-900">Food Database</h2>
                  <span className="text-sm text-gray-500">({filteredBuiltInFoods.length})</span>
                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">                  {filteredBuiltInFoods.map(food => (                    <FoodCard                      key={food.id}                      food={food}                      onAdd={addFoodEntry}                      isCustom={false}                    />                  ))}                </div>
              </div>
            )}

            {/* No Results Message */}
            {!showAddFoodForm && filteredFoods.length === 0 && searchTerm && (
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                <Search className="mx-auto text-gray-300 mb-4" size={32} />
                <p className="text-gray-500 text-sm mb-4">No foods found for "{searchTerm}"</p>
                <button
                  onClick={() => setShowAddFoodForm(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Add "{searchTerm}" as a custom food
                </button>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'history' && (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <BarChart3 className="mx-auto text-gray-300 mb-6" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Dashboard</h3>
            <p className="text-gray-600 text-sm max-w-md mx-auto">
              Detailed nutrition analytics and trends will be available here. Track your progress over time with comprehensive charts and insights.
            </p>
          </div>
        )}

        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Daily Targets</h2>
                <p className="text-sm text-gray-600 mt-1">Set your daily nutritional goals</p>
              </div>
              <div className="flex gap-3">
                {!editingGoals && !showCalculator && !calculatorResults && (
                  <>
                    <button
                      onClick={() => setShowCalculator(true)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 px-3 py-1 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      Calculate Goals
                    </button>
                    <button
                      onClick={() => {
                        setEditingGoals(true);
                        setNewGoals(goals);
                      }}
                      className="text-sm font-medium text-gray-900 hover:text-gray-700 inline-flex items-center gap-1"
                    >
                      <Edit3 size={14} />
                      Edit
                    </button>
                  </>
                )}
                {calculatorResults && (
                  <button
                    onClick={() => {
                      setCalculatorResults(null);
                      setShowCalculator(true);
                    }}
                    className="text-sm font-medium text-gray-600 hover:text-gray-700"
                  >
                    ← Back to Calculator
                  </button>
                )}
              </div>
            </div>

            <div className="p-6">
              {showCalculator && !calculatorResults ? (
                // Calorie Calculator
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-700">
                      Modify the values and click the Calculate button to get personalized calorie recommendations
                    </p>
                  </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">                    <div>                      <label className="block text-sm font-medium text-gray-700 mb-2">                        Age                      </label>
                      <input
                        type="number"
                        value={calculatorData.age}
                        onChange={(e) => setCalculatorData({...calculatorData, age: Number(e.target.value)})}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none text-sm"
                        min="15"
                        max="80"
                      />
                      <p className="text-xs text-gray-500 mt-1">ages 15 - 80</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gender
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="gender"
                            value="male"
                            checked={calculatorData.gender === 'male'}
                            onChange={(e) => setCalculatorData({...calculatorData, gender: e.target.value as 'male' | 'female'})}
                            className="mr-2"
                          />
                          Male
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="gender"
                            value="female"
                            checked={calculatorData.gender === 'female'}
                            onChange={(e) => setCalculatorData({...calculatorData, gender: e.target.value as 'male' | 'female'})}
                            className="mr-2"
                          />
                          Female
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Height (feet)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={calculatorData.height}
                        onChange={(e) => setCalculatorData({...calculatorData, height: Number(e.target.value)})}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Weight (pounds)
                      </label>
                      <input
                        type="number"
                        value={calculatorData.weight}
                        onChange={(e) => setCalculatorData({...calculatorData, weight: Number(e.target.value)})}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Activity Level
                    </label>
                    <select
                      value={calculatorData.activityLevel}
                      onChange={(e) => setCalculatorData({...calculatorData, activityLevel: e.target.value as keyof typeof activityMultipliers})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none text-sm"
                    >
                      <option value="sedentary">Sedentary: little or no exercise</option>
                      <option value="light">Light: exercise 1-3 times/week</option>
                      <option value="moderate">Moderate: exercise 4-5 times/week</option>
                      <option value="active">Active: daily exercise or intense exercise 3-4 times/week</option>
                      <option value="veryActive">Very Active: intense exercise 6-7 times/week</option>
                    </select>
                  </div>

                  {/* Validation Errors */}
                  {calculatorValidationErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                        <div className="text-sm text-red-600">
                          <p className="font-medium mb-1">Please fix the following errors:</p>
                          <ul className="list-disc list-inside space-y-0.5">
                            {calculatorValidationErrors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                                    <div className="flex flex-col sm:flex-row gap-3 pt-4">                    <button                      onClick={calculateCalories}                      className="flex-1 sm:flex-none px-6 sm:px-8 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2"                    >                      Calculate                      <ChevronRight size={16} />                    </button>                    <button                      onClick={() => {
                        setShowCalculator(false);
                        setCalculatorValidationErrors([]);
                      }}                      className="flex-1 sm:flex-none px-6 py-3 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"                    >                      Cancel                    </button>                  </div>
                </div>
              ) : calculatorResults ? (
                // Calculator Results
                <div className="space-y-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <h3 className="font-medium text-green-900 mb-2">Results</h3>
                    <p className="text-sm text-green-700">
                      The results show a number of daily calorie estimates that can be used as a guideline for how many 
                      calories to consume each day to maintain, lose, or gain weight at a chosen rate.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => applyCalculatedGoals(calculatorResults.maintenance)}
                        className="w-full p-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-100"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium text-gray-900">Maintain weight</h4>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-gray-900">{calculatorResults.maintenance.toLocaleString()}</div>
                            <div className="text-sm text-gray-500">100%</div>
                            <div className="text-xs text-gray-500">Calories/day</div>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => applyCalculatedGoals(calculatorResults.mildLoss)}
                        className="w-full p-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-100"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium text-gray-900">Mild weight loss</h4>
                            <p className="text-sm text-gray-600">0.5 lb/week</p>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-gray-900">{calculatorResults.mildLoss.toLocaleString()}</div>
                            <div className="text-sm text-gray-500">90%</div>
                            <div className="text-xs text-gray-500">Calories/day</div>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => applyCalculatedGoals(calculatorResults.weightLoss)}
                        className="w-full p-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-100"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium text-gray-900">Weight loss</h4>
                            <p className="text-sm text-gray-600">1 lb/week</p>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-gray-900">{calculatorResults.weightLoss.toLocaleString()}</div>
                            <div className="text-sm text-gray-500">80%</div>
                            <div className="text-xs text-gray-500">Calories/day</div>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => applyCalculatedGoals(calculatorResults.extremeLoss)}
                        className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium text-gray-900">Extreme weight loss</h4>
                            <p className="text-sm text-gray-600">2 lb/week</p>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-gray-900">{calculatorResults.extremeLoss.toLocaleString()}</div>
                            <div className="text-sm text-gray-500">61%</div>
                            <div className="text-xs text-gray-500">Calories/day</div>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                    <p className="mb-2"><strong>Note:</strong> Macro ratios are automatically calculated as:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Protein: 1g per lb bodyweight ({calculatorData.weight}g)</li>
                      <li>Fat: 25% of total calories</li>
                      <li>Carbs: Remaining calories</li>
                    </ul>
                  </div>
                </div>
              ) : editingGoals ? (
                <div className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">                    {Object.entries(newGoals).map(([key, value]) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {key.charAt(0).toUpperCase() + key.slice(1)} {key === 'calories' ? '' : '(grams)'}
                        </label>
                        <input
                          type="number"
                          value={value}
                          onChange={(e) => setNewGoals({...newGoals, [key]: Number(e.target.value)})}
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  
                  {/* Validation Errors */}
                  {goalsValidationErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                        <div className="text-sm text-red-600">
                          <p className="font-medium mb-1">Please fix the following errors:</p>
                          <ul className="list-disc list-inside space-y-0.5">
                            {goalsValidationErrors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                  
                                    <div className="flex flex-col sm:flex-row gap-3 pt-4">                    <button                      onClick={updateGoals}                      className="flex-1 sm:flex-none px-6 py-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"                    >                      Save Changes                    </button>                    <button                      onClick={() => {
                        setEditingGoals(false);
                        setGoalsValidationErrors([]);
                      }}                      className="flex-1 sm:flex-none px-6 py-3 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"                    >                      Cancel                    </button>                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {Object.entries(goals).map(([key, value], index) => {
                    const gradients = [
                      'bg-gradient-to-br from-orange-400 to-red-500',
                      'bg-gradient-to-br from-blue-400 to-blue-600', 
                      'bg-gradient-to-br from-green-400 to-emerald-600',
                      'bg-gradient-to-br from-purple-400 to-purple-600'
                    ];
                    return (
                      <div key={key} className={`text-center p-6 rounded-lg border border-gray-100 ${gradients[index]} text-white`}>
                        <h3 className="text-xs font-medium text-white/80 uppercase tracking-wide mb-2">
                          {key}
                        </h3>
                        <p className="text-2xl font-light text-white">
                          {value}<span className="text-sm text-white/70">{key === 'calories' ? '' : 'g'}</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main App component with authentication
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
};

// Authenticated app wrapper
const AuthenticatedApp: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingSpinner />;
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <AuthForm />;
  }

  // Show main app if authenticated
  return <MacroTracker />;
};

export default App;