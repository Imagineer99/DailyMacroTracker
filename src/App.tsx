import React, { useState, useEffect } from 'react';
import { Plus, Target, Calendar, User, Home, BarChart3, LogOut } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthForm from './components/AuthForm';
import { api } from './utils/api';
import { Food, DailyEntry } from './types';

// Import page components
import OverviewPage from './pages/OverviewPage';
import AddFoodPage from './pages/AddFoodPage';
import AnalyticsPage from './pages/AnalyticsPage';
import GoalsPage from './pages/GoalsPage';

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
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]);
  const [goals, setGoals] = useState({
    calories: 2200,
    protein: 165,
    carbs: 275,
    fat: 73
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isDeletingEntry, setIsDeletingEntry] = useState(false);
  const [isManualSaving, setIsManualSaving] = useState(false);

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

  // Legacy localStorage for backward compatibility
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
  const addCustomFood = (food: Food) => {
    setCustomFoods([...customFoods, food]);
  };

  const updateCustomFood = (updatedFood: Food) => {
    setCustomFoods(customFoods.map(food => 
      food.id === updatedFood.id ? updatedFood : food
    ));
  };

  const deleteCustomFood = (foodId: number) => {
    setCustomFoods(customFoods.filter(food => food.id !== foodId));
  };

  const addFoodEntry = async (food: Food, customPortionSize?: number) => {
    let actualPortionSize: number;
    
    // Handle portion size validation and parsing
    if (customPortionSize !== undefined) {
      actualPortionSize = customPortionSize;
    } else {
      console.error('No portion size provided');
      return;
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

  const updateGoals = (newGoals: typeof goals) => {
    setGoals(newGoals);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                <Target className="text-white" size={18} />
              </div>
              <h1 className="text-lg sm:text-xl font-light text-gray-900 tracking-tight">
                Nutrition Tracker
              </h1>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-6">
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
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Navigation */}
        <nav className="mb-6 sm:mb-10 bg-white border border-gray-200 rounded-lg p-1">
          <div className="grid grid-cols-2 sm:flex gap-1">
            {[
              { id: 'dashboard', label: 'Overview', icon: Home },
              { id: 'add-food', label: 'Add Food', icon: Plus },
              { id: 'history', label: 'Analytics', icon: BarChart3 },
              { id: 'goals', label: 'Goals', icon: Target }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-6 py-3 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden text-xs">{tab.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Page Content */}
        {activeTab === 'dashboard' && (
          <OverviewPage
            dailyEntries={dailyEntries}
            goals={goals}
            selectedDate={selectedDate}
            onRemoveFoodEntry={removeFoodEntry}
            onSetActiveTab={setActiveTab}
            countCorruptedEntries={countCorruptedEntries}
            onManualCleanup={manualCleanupCorruptedEntries}
          />
        )}

        {activeTab === 'add-food' && (
          <AddFoodPage
            foods={foods}
            customFoods={customFoods}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            onAddCustomFood={addCustomFood}
            onUpdateCustomFood={updateCustomFood}
            onDeleteCustomFood={deleteCustomFood}
            onAddFoodEntry={addFoodEntry}
          />
        )}

        {activeTab === 'history' && <AnalyticsPage />}

        {activeTab === 'goals' && (
          <GoalsPage
            goals={goals}
            onUpdateGoals={updateGoals}
          />
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