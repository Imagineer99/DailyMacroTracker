import React, { useState } from 'react';
import { Edit3, ChevronRight, AlertCircle } from 'lucide-react';
import { validateCalculatorData, validateGoals } from '../utils/validation';

interface Goals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface CalculatorData {
  age: number;
  gender: 'male' | 'female';
  height: number;
  heightInches: number;
  weight: number;
  activityLevel: keyof typeof activityMultipliers;
  unitSystem: 'imperial' | 'metric';
}

interface CalculatorResults {
  maintenance: number;
  mildLoss: number;
  weightLoss: number;
  extremeLoss: number;
}

interface GoalsPageProps {
  goals: Goals;
  onUpdateGoals: (goals: Goals) => void;
}

// Activity multipliers for calorie calculation
const activityMultipliers = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9
};

const GoalsPage: React.FC<GoalsPageProps> = ({ goals, onUpdateGoals }) => {
  const [editingGoals, setEditingGoals] = useState(false);
  const [newGoals, setNewGoals] = useState(goals);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorData, setCalculatorData] = useState<CalculatorData>({
    age: 25,
    gender: 'male',
    height: 5,
    heightInches: 10,
    weight: 165,
    activityLevel: 'moderate',
    unitSystem: 'imperial'
  });
  const [calculatorResults, setCalculatorResults] = useState<CalculatorResults | null>(null);
  const [calculatorValidationErrors, setCalculatorValidationErrors] = useState<string[]>([]);
  const [goalsValidationErrors, setGoalsValidationErrors] = useState<string[]>([]);

  const updateGoals = () => {
    // Validate goals data
    const validation = validateGoals(newGoals);
    if (!validation.isValid) {
      setGoalsValidationErrors(validation.errors);
      return;
    }
    
    // Clear validation errors if validation passes
    setGoalsValidationErrors([]);
    
    onUpdateGoals(newGoals);
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
    
    // Mifflin-St Jeor Equation (requires metric units)
    let bmr;
    let heightInCm: number;
    let weightInKg: number;
    
    if (calculatorData.unitSystem === 'imperial') {
      // Convert imperial to metric
      const totalHeightInFeet = calculatorData.height + (calculatorData.heightInches / 12);
      heightInCm = totalHeightInFeet * 30.48; // convert feet to cm
      weightInKg = calculatorData.weight * 0.453592; // convert lbs to kg
    } else {
      // Already in metric
      heightInCm = calculatorData.height; // height is in cm for metric
      weightInKg = calculatorData.weight; // weight is in kg for metric
    }
    
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
    let protein: number;
    
    if (calculatorData.unitSystem === 'imperial') {
      protein = Math.round(calculatorData.weight * 1); // 1g per lb bodyweight
    } else {
      protein = Math.round(calculatorData.weight * 2.2); // 1g per lb = 2.2g per kg
    }
    
    const fat = Math.round(calorieTarget * 0.25 / 9); // 25% of calories from fat
    const carbs = Math.round((calorieTarget - (protein * 4) - (fat * 9)) / 4); // remaining calories from carbs
    
    const newTargets = {
      calories: calorieTarget,
      protein: protein,
      carbs: Math.max(carbs, 50), // minimum 50g carbs
      fat: fat
    };
    
    onUpdateGoals(newTargets);
    setCalculatorResults(null);
    setShowCalculator(false);
  };

  return (
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
          <div className="space-y-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">i</span>
                </div>
                <p className="text-sm text-blue-700 leading-relaxed">
                  Modify the values and click the Calculate button to get personalized calorie recommendations
                </p>
              </div>
            </div>

            {/* Unit System Toggle */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Unit System
              </label>
              <div className="flex gap-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="unitSystem"
                    value="imperial"
                    checked={calculatorData.unitSystem === 'imperial'}
                    onChange={(e) => setCalculatorData({
                      ...calculatorData, 
                      unitSystem: e.target.value as 'imperial' | 'metric',
                      // Reset height and weight when switching units
                      height: e.target.value === 'imperial' ? 5.83 : 175,
                      heightInches: e.target.value === 'imperial' ? 10 : 0,
                      weight: e.target.value === 'imperial' ? 165 : 75
                    })}
                    className="mr-3 w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-900">Imperial</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="unitSystem"
                    value="metric"
                    checked={calculatorData.unitSystem === 'metric'}
                    onChange={(e) => setCalculatorData({
                      ...calculatorData, 
                      unitSystem: e.target.value as 'imperial' | 'metric',
                      // Reset height and weight when switching units
                      height: e.target.value === 'imperial' ? 5.83 : 175,
                      heightInches: e.target.value === 'imperial' ? 10 : 0,
                      weight: e.target.value === 'imperial' ? 165 : 75
                    })}
                    className="mr-3 w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-900">Metric</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={calculatorData.age}
                    onChange={(e) => setCalculatorData({...calculatorData, age: Number(e.target.value)})}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    min="15"
                    max="80"
                    placeholder="25"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">years</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">ages 15 - 80</p>
              </div>

              <div className="gender-selection">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <div className="gender-options flex gap-6">
                  <label className="gender-option gender-male flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="male"
                      checked={calculatorData.gender === 'male'}
                      onChange={(e) => setCalculatorData({...calculatorData, gender: e.target.value as 'male' | 'female'})}
                      className="gender-radio mr-3 w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="gender-label text-sm font-medium text-gray-900">Male</span>
                  </label>
                  <label className="gender-option gender-female flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="female"
                      checked={calculatorData.gender === 'female'}
                      onChange={(e) => setCalculatorData({...calculatorData, gender: e.target.value as 'male' | 'female'})}
                      className="gender-radio mr-3 w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="gender-label text-sm font-medium text-gray-900">Female</span>
                  </label>
                </div>
              </div>

              {/* Height Input - Different for Imperial vs Metric */}
              {calculatorData.unitSystem === 'imperial' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Height
                  </label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        value={calculatorData.height}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Only allow single digit numbers between 3-8
                          if (value === '' || (value.length === 1 && /^[3-8]$/.test(value))) {
                            setCalculatorData({...calculatorData, height: value === '' ? 0 : Number(value)});
                          }
                        }}
                        className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                        min="3"
                        max="8"
                        placeholder="5"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">ft</span>
                    </div>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        value={calculatorData.heightInches}
                        onChange={(e) => setCalculatorData({...calculatorData, heightInches: Number(e.target.value)})}
                        className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                        min="0"
                        max="11"
                        placeholder="10"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">in</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Height
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={calculatorData.height}
                      onChange={(e) => setCalculatorData({...calculatorData, height: Number(e.target.value)})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                      min="100"
                      max="250"
                      placeholder="175"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">cm</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weight
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={calculatorData.weight}
                    onChange={(e) => setCalculatorData({...calculatorData, weight: Number(e.target.value)})}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    min={calculatorData.unitSystem === 'imperial' ? "50" : "20"}
                    max={calculatorData.unitSystem === 'imperial' ? "1000" : "450"}
                    placeholder={calculatorData.unitSystem === 'imperial' ? "165" : "75"}
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                    {calculatorData.unitSystem === 'imperial' ? 'lbs' : 'kg'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Activity Level
              </label>
              <select
                value={calculatorData.activityLevel}
                onChange={(e) => setCalculatorData({...calculatorData, activityLevel: e.target.value as keyof typeof activityMultipliers})}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white"
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

            <div className="flex flex-col sm:flex-row gap-3 pt-6">
              <button
                onClick={calculateCalories}
                className="flex-1 sm:flex-none px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 inline-flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
              >
                Calculate
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => {
                  setShowCalculator(false);
                  setCalculatorValidationErrors([]);
                }}
                className="flex-1 sm:flex-none px-6 py-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
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
                      <p className="text-sm text-gray-600">
                        {calculatorData.unitSystem === 'imperial' ? '0.5 lb/week' : '0.25 kg/week'}
                      </p>
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
                      <p className="text-sm text-gray-600">
                        {calculatorData.unitSystem === 'imperial' ? '1 lb/week' : '0.5 kg/week'}
                      </p>
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
                      <p className="text-sm text-gray-600">
                        {calculatorData.unitSystem === 'imperial' ? '2 lb/week' : '1 kg/week'}
                      </p>
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
                <li>
                  Protein: {calculatorData.unitSystem === 'imperial' 
                    ? `1g per lb bodyweight (${Math.round(calculatorData.weight)}g)` 
                    : `2.2g per kg bodyweight (${Math.round(calculatorData.weight * 2.2)}g)`
                  }
                </li>
                <li>Fat: 25% of total calories</li>
                <li>Carbs: Remaining calories</li>
              </ul>
            </div>
          </div>
        ) : editingGoals ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {Object.entries(newGoals).map(([key, value]) => (
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
            
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={updateGoals}
                className="flex-1 sm:flex-none px-6 py-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setEditingGoals(false);
                  setGoalsValidationErrors([]);
                }}
                className="flex-1 sm:flex-none px-6 py-3 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
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
  );
};

export default GoalsPage; 