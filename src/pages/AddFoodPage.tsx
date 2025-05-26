import React, { useState } from 'react';
import { Search, UserPlus, Apple, Plus, Edit3, Trash2, X, Save, AlertCircle } from 'lucide-react';
import { Food } from '../types';
import { validateFood, validatePortionSize, sanitizeString, type FoodData } from '../utils/validation';

interface FoodCardProps {
  food: Food;
  onEdit?: (food: Food) => void;
  onDelete?: (foodId: number) => void;
  isCustom?: boolean;
  onAddToPortionModal: (food: Food) => void;
}

const FoodCard: React.FC<FoodCardProps> = ({ food, onEdit, onDelete, isCustom = false, onAddToPortionModal }) => {
  // Utility function to safely display numeric values
  const safeDisplayValue = (value: number | string, decimals: number = 0): string => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '0';
    return numValue.toFixed(decimals);
  };

  return (
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
            onClick={() => onAddToPortionModal(food)}
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
};

interface PortionModalProps {
  isOpen: boolean;
  food: Food | null;
  portionSize: string;
  onPortionSizeChange: (value: string) => void;
  onAddFood: () => void;
  onClose: () => void;
  validationErrors: string[];
}

const PortionModal: React.FC<PortionModalProps> = ({
  isOpen,
  food,
  portionSize,
  onPortionSizeChange,
  onAddFood,
  onClose,
  validationErrors
}) => {
  if (!isOpen || !food) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            Add {food.name}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Portion Size ({food.unit || 'g'})
            </label>
            <input
              type="number"
              value={portionSize}
              onChange={(e) => onPortionSizeChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none text-sm"
              placeholder="100"
              min="1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Nutrition values are per {food.serving}
            </p>
          </div>
          
          {/* Preview nutritional values */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Nutritional Preview</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {(() => {
                const basePortionSize = parseFloat(food.serving.replace(/[^\d.]/g, '')) || 100;
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
                      <span className="font-medium text-gray-900">{safeCalculate(food.calories, 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Protein</span>
                      <span className="font-medium text-gray-900">{safeCalculate(food.protein)}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Carbs</span>
                      <span className="font-medium text-gray-900">{safeCalculate(food.carbs)}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fat</span>
                      <span className="font-medium text-gray-900">{safeCalculate(food.fat)}g</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
        
        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm text-red-600">
                <p className="font-medium mb-1">Please fix the following:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex gap-3 pt-6">
          <button
            onClick={onAddFood}
            className="flex-1 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Add to Diary
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

interface AddFoodPageProps {
  foods: Food[];
  customFoods: Food[];
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onAddCustomFood: (food: Food) => void;
  onUpdateCustomFood: (food: Food) => void;
  onDeleteCustomFood: (foodId: number) => void;
  onAddFoodEntry: (food: Food, portionSize?: number) => void;
}

const AddFoodPage: React.FC<AddFoodPageProps> = ({
  foods,
  customFoods,
  searchTerm,
  onSearchTermChange,
  onAddCustomFood,
  onUpdateCustomFood,
  onDeleteCustomFood,
  onAddFoodEntry
}) => {
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
  const [showPortionModal, setShowPortionModal] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [portionSize, setPortionSize] = useState('100');
  const [foodValidationErrors, setFoodValidationErrors] = useState<string[]>([]);
  const [portionValidationErrors, setPortionValidationErrors] = useState<string[]>([]);

  // Utility function to safely display numeric values
  const safeDisplayValue = (value: number | string, decimals: number = 0): string => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '0';
    return numValue.toFixed(decimals);
  };

  const openPortionModal = (food: Food) => {
    setSelectedFood(food);
    setPortionSize('100');
    setShowPortionModal(true);
  };

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

    onAddCustomFood(customFood);
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

    onUpdateCustomFood(updatedFood);
    setEditingFood(null);
    setNewFood({ name: '', calories: '', protein: '', carbs: '', fat: '', serving: '100', unit: 'g' });
    setShowAddFoodForm(false);
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

  const handleAddFoodEntry = () => {
    if (selectedFood) {
      // Validate portion size
      const validation = validatePortionSize(portionSize);
      if (!validation.isValid) {
        setPortionValidationErrors(validation.errors);
        return;
      }
      setPortionValidationErrors([]);
      
      const actualPortionSize = parseFloat(portionSize);
      if (isNaN(actualPortionSize) || actualPortionSize <= 0) {
        setPortionValidationErrors(['Invalid portion size']);
        return;
      }

      onAddFoodEntry(selectedFood, actualPortionSize);
      setShowPortionModal(false);
      setSelectedFood(null);
      setPortionSize('100');
    }
  };

  const closePortionModal = () => {
    setShowPortionModal(false);
    setPortionValidationErrors([]);
  };

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

  return (
    <div className="space-y-8">
      {/* Search and Add Custom Food Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search food database..."
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none text-sm"
            />
          </div>
          <button
            onClick={() => setShowAddFoodForm(true)}
            className="px-4 sm:px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <UserPlus size={16} />
            <span className="hidden sm:inline">Add Custom Food</span>
            <span className="sm:hidden">Add Food</span>
          </button>
        </div>
      </div>

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
                Calories per 100{newFood.unit}
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
                Protein per 100{newFood.unit}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={newFood.protein}
                  onChange={(e) => setNewFood({...newFood, protein: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none text-sm"
                  placeholder="31"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">{newFood.unit}</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Carbs per 100{newFood.unit}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={newFood.carbs}
                  onChange={(e) => setNewFood({...newFood, carbs: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none text-sm"
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">{newFood.unit}</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fat per 100{newFood.unit}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={newFood.fat}
                  onChange={(e) => setNewFood({...newFood, fat: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none text-sm"
                  placeholder="3.6"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">{newFood.unit}</span>
              </div>
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
      <PortionModal
        isOpen={showPortionModal}
        food={selectedFood}
        portionSize={portionSize}
        onPortionSizeChange={setPortionSize}
        onAddFood={handleAddFoodEntry}
        onClose={closePortionModal}
        validationErrors={portionValidationErrors}
      />

      {/* My Foods Section */}
      {!showAddFoodForm && filteredCustomFoods.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-6">
            <UserPlus className="text-blue-600" size={20} />
            <h2 className="text-lg font-medium text-gray-900">My Foods</h2>
            <span className="text-sm text-gray-500">({filteredCustomFoods.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredCustomFoods.map(food => (
              <FoodCard
                key={food.id}
                food={food}
                onEdit={startEditingFood}
                onDelete={onDeleteCustomFood}
                isCustom={true}
                onAddToPortionModal={openPortionModal}
              />
            ))}
          </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredBuiltInFoods.map(food => (
              <FoodCard
                key={food.id}
                food={food}
                isCustom={false}
                onAddToPortionModal={openPortionModal}
              />
            ))}
          </div>
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
  );
};

export default AddFoodPage; 