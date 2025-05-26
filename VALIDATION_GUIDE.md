# Input Validation Guide - Fitness Tracker App

## Overview

This fitness tracker app now includes comprehensive input validation on both client-side (React) and server-side (Node.js/Express) to ensure data integrity, security, and user experience.

## Validation Architecture

### Client-Side Validation (`src/utils/validation.ts`)

**Purpose**: Immediate feedback to users, preventing unnecessary server requests

**Features**:
- Real-time validation with visual feedback
- Comprehensive error messages
- Cross-validation (e.g., macro calculations)
- Input sanitization

### Server-Side Validation (`backend/server.js`)

**Purpose**: Security, data integrity, and protection against malicious requests

**Features**:
- Data type validation
- Range validation
- Structure validation
- Rate limiting for auth endpoints

## Validation Rules

### 🍎 Food Data Validation

**Client-Side Rules**:
```typescript
- Name: Required, 2-100 characters
- Calories: Required, 0-9000 per 100g
- Protein: Required, 0-100g per 100g
- Carbs: Required, 0-100g per 100g
- Fat: Required, 0-100g per 100g
- Cross-validation: Macro calories vs total calories (20% tolerance)
```

**Server-Side Rules**:
```javascript
- Name: String, min 2 characters
- Calories: Number, 0-9000
- Protein: Number, 0-100
- Carbs: Number, 0-100
- Fat: Number, 0-100
```

### 📏 Portion Size Validation

**Rules**:
```typescript
- Required field
- Must be a valid number
- Must be greater than 0
- Maximum 10,000g (reasonable limit)
```

### 🧮 Calculator Data Validation

**Rules**:
```typescript
- Age: Required, 15-80 years
- Height: Required, 3-8 feet
- Weight: Required, 50-1000 pounds
- Gender: Required, 'male' or 'female'
```

### 🎯 Goals Validation

**Client-Side Rules**:
```typescript
- Calories: Required, 800-10,000
- Protein: Required, 10-500g
- Carbs: Required, 0-1000g
- Fat: Required, 10-300g
- Cross-validation: Macro calories vs calorie goal (15% tolerance)
```

**Server-Side Rules**:
```javascript
- Calories: Number, 0-10,000
- Protein: Number, 0-500
- Carbs: Number, 0-1000
- Fat: Number, 0-300
```

### 🔐 Authentication Validation

**Client & Server Rules**:
```typescript
- Username: Required, min 3 characters, alphanumeric + underscore
- Password: Required, min 6 characters
- Rate limiting: 5 attempts per 5 minutes
```

## Implementation Details

### Validation Functions

```typescript
// Main validation functions
validateFood(food: FoodData): ValidationResult
validatePortionSize(portionSize: string): ValidationResult
validateCalculatorData(data: CalculatorData): ValidationResult
validateGoals(goals: GoalsData): ValidationResult

// Utility functions
sanitizeString(input: string): string
formatValidationErrors(errors: string[]): string
```

### Error Display

**ValidationErrors Component** (`src/components/ValidationErrors.tsx`):
- Consistent error display across the app
- Clear, actionable error messages
- Visual indicators with icons

### State Management

**Validation States**:
```typescript
const [foodValidationErrors, setFoodValidationErrors] = useState<string[]>([]);
const [portionValidationErrors, setPortionValidationErrors] = useState<string[]>([]);
const [calculatorValidationErrors, setCalculatorValidationErrors] = useState<string[]>([]);
const [goalsValidationErrors, setGoalsValidationErrors] = useState<string[]>([]);
```

## Security Features

### Input Sanitization
- HTML tag removal (`<>` characters)
- String trimming
- XSS prevention

### Rate Limiting
- Authentication endpoints: 5 requests per 5 minutes
- General API: 100 requests per 15 minutes

### Data Validation
- Type checking on server
- Range validation
- Structure validation for arrays/objects

## User Experience Features

### Real-Time Feedback
- Validation occurs on form submission
- Clear error messages with specific guidance
- Visual indicators (red borders, error icons)

### Cross-Validation
- **Food Form**: Checks if macro calories match total calories
- **Goals Form**: Ensures macro goals align with calorie goals
- Provides warnings when values seem inconsistent

### Error Recovery
- Errors clear when forms are cancelled
- Validation re-runs when users fix issues
- Non-blocking validation (users can still interact)

## Testing Validation

### Manual Testing Scenarios

**Food Form**:
1. Try submitting empty fields
2. Enter negative values
3. Enter extremely high values (>9000 calories)
4. Enter inconsistent macro values

**Portion Modal**:
1. Enter negative portion size
2. Enter zero or empty value
3. Enter extremely large values

**Calculator**:
1. Enter age outside 15-80 range
2. Enter invalid height/weight values
3. Leave required fields empty

**Goals**:
1. Enter calories below 800
2. Enter protein above 500g
3. Set macros that don't match calorie goal

### API Testing
```bash
# Test invalid food data
curl -X POST http://localhost:3001/api/user/data \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"customFoods": [{"name": "", "calories": -100}]}'

# Should return 400 error with validation message
```

## Best Practices

### For Developers

1. **Always validate on both client and server**
2. **Provide clear, actionable error messages**
3. **Use consistent validation patterns**
4. **Clear validation errors when appropriate**
5. **Test edge cases thoroughly**

### For Users

1. **Read error messages carefully**
2. **Check that macro values make sense**
3. **Use reasonable portion sizes**
4. **Ensure calculator inputs are accurate**

## Future Enhancements

### Potential Improvements
- Real-time validation as user types
- Custom validation rules per user
- Bulk import validation
- Advanced nutritional validation (micronutrients)
- Integration with nutrition databases for validation

### Performance Optimizations
- Debounced validation for real-time feedback
- Memoized validation functions
- Optimistic updates with rollback on validation failure

## Troubleshooting

### Common Issues

**"Nutritional values don't match expected calorie calculation"**
- Check that protein/carbs/fat values are reasonable
- Remember: Protein = 4 cal/g, Carbs = 4 cal/g, Fat = 9 cal/g
- 20% tolerance is allowed for rounding/fiber content

**"Portion size seems too large"**
- Maximum allowed is 10,000g (10kg)
- Consider if you meant a smaller unit

**"Macro goals don't match calorie goal"**
- Ensure protein + carbs + fat calories ≈ total calories
- 15% tolerance is allowed for flexibility

### Getting Help

If validation seems incorrect:
1. Check the specific error message
2. Verify your input values are reasonable
3. Consider nutritional accuracy of your data
4. Contact support if validation seems wrong

---

*This validation system ensures data quality while maintaining a smooth user experience. All validation rules are based on nutritional science and practical usage patterns.* 