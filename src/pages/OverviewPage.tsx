import React from 'react';
import { Utensils, Trash2, ChevronRight } from 'lucide-react';
import { DailyEntry } from '../types';
import DataCleanup from '../components/DataCleanup';

interface MacroProgressBarProps {
  label: string;
  current: number;
  goal: number;
  unit?: string;
  gradient: string;
}

const MacroProgressBar: React.FC<MacroProgressBarProps> = ({ label, current, goal, unit = 'g', gradient }) => {
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

interface OverviewPageProps {
  dailyEntries: DailyEntry[];
  goals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  selectedDate: string;
  onRemoveFoodEntry: (entryId: number) => void;
  onSetActiveTab: (tab: string) => void;
  countCorruptedEntries: () => number;
  onManualCleanup: () => void;
}

const OverviewPage: React.FC<OverviewPageProps> = ({
  dailyEntries,
  goals,
  selectedDate,
  onRemoveFoodEntry,
  onSetActiveTab,
  countCorruptedEntries,
  onManualCleanup
}) => {
  // Utility function to safely display numeric values
  const safeDisplayValue = (value: number | string, decimals: number = 0): string => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '0';
    return numValue.toFixed(decimals);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const todaysEntries = dailyEntries.filter(entry => entry.date === selectedDate);

  return (
    <div className="space-y-8">
      {/* Data Cleanup Warning */}
      <DataCleanup 
        corruptedEntries={countCorruptedEntries()} 
        onCleanup={onManualCleanup}
      />
      
      {/* Daily Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <MacroProgressBar
          label="Calories"
          current={dailyTotals.calories}
          goal={goals.calories}
          unit=""
          gradient="bg-gradient-to-r from-orange-400 to-red-500"
        />
        <MacroProgressBar
          label="Protein"
          current={dailyTotals.protein}
          goal={goals.protein}
          gradient="bg-gradient-to-r from-blue-400 to-blue-600"
        />
        <MacroProgressBar
          label="Carbs"
          current={dailyTotals.carbs}
          goal={goals.carbs}
          gradient="bg-gradient-to-r from-green-400 to-emerald-600"
        />
        <MacroProgressBar
          label="Fat"
          current={dailyTotals.fat}
          goal={goals.fat}
          gradient="bg-gradient-to-r from-purple-400 to-purple-600"
        />
      </div>

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
                onClick={() => onSetActiveTab('add-food')}
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
                      onClick={() => onRemoveFoodEntry(entry.id)}
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
  );
};

export default OverviewPage; 