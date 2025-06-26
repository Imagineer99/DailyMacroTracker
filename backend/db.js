const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Generate a random encryption key if not exists
const KEY_DIR = path.join(__dirname, 'data');
const KEY_PATH = path.join(KEY_DIR, '.key');

if (!fs.existsSync(KEY_DIR)) {
    fs.mkdirSync(KEY_DIR, { recursive: true });
}

let encryptionKey;

if (!fs.existsSync(KEY_PATH)) {
    encryptionKey = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(KEY_PATH, encryptionKey);
} else {
    encryptionKey = fs.readFileSync(KEY_PATH, 'utf8');
}

// Initialize database with encryption and security settings
const db = new Database(path.join(__dirname, 'data', 'nutrition.db'), {
    verbose: process.env.NODE_ENV === 'development' ? console.log : null,
    fileMustExist: false,
    readonly: false,
    timeout: 5000,
    // Add encryption key to database
    key: encryptionKey
});

// Set secure pragmas for production performance
db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL'); // Balance between performance and safety
db.pragma('temp_store = MEMORY'); // Store temp tables in memory
db.pragma('mmap_size = 268435456'); // 256MB memory map (more reasonable)
db.pragma('cache_size = 10000'); // 10MB cache
db.pragma('wal_autocheckpoint = 1000'); // Checkpoint every 1000 pages

// Create tables if they don't exist
function initializeDatabase() {
    // Users table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Custom foods table
    db.exec(`
        CREATE TABLE IF NOT EXISTS custom_foods (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            calories REAL NOT NULL,
            protein REAL NOT NULL,
            carbs REAL NOT NULL,
            fat REAL NOT NULL,
            serving TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Daily entries table
    db.exec(`
        CREATE TABLE IF NOT EXISTS daily_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            food_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            servings REAL NOT NULL,
            calories REAL NOT NULL,
            protein REAL NOT NULL,
            carbs REAL NOT NULL,
            fat REAL NOT NULL,
            date TEXT NOT NULL,
            meal_time TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // User goals table
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_goals (
            user_id TEXT PRIMARY KEY,
            calories INTEGER NOT NULL DEFAULT 2200,
            protein INTEGER NOT NULL DEFAULT 165,
            carbs INTEGER NOT NULL DEFAULT 275,
            fat INTEGER NOT NULL DEFAULT 73,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // User calculator data table
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_calculator_data (
            user_id TEXT PRIMARY KEY,
            age INTEGER NOT NULL DEFAULT 25,
            gender TEXT NOT NULL DEFAULT 'male' CHECK (gender IN ('male', 'female')),
            height REAL NOT NULL DEFAULT 5,
            height_inches INTEGER NOT NULL DEFAULT 10,
            weight REAL NOT NULL DEFAULT 165,
            activity_level TEXT NOT NULL DEFAULT 'moderate' CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'veryActive')),
            unit_system TEXT NOT NULL DEFAULT 'imperial' CHECK (unit_system IN ('imperial', 'metric')),
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Create indexes for better performance
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_custom_foods_user_id ON custom_foods(user_id);
        CREATE INDEX IF NOT EXISTS idx_daily_entries_user_id ON daily_entries(user_id);
        CREATE INDEX IF NOT EXISTS idx_daily_entries_date ON daily_entries(date);
    `);
}

// Initialize the database
initializeDatabase();

// Prepare statements for common operations
const statements = {
    // User operations
    createUser: db.prepare('INSERT INTO users (id, username, password) VALUES (?, ?, ?)'),
    findUserByUsername: db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE'),
    findUserById: db.prepare('SELECT * FROM users WHERE id = ?'),

    // Custom foods operations
    insertCustomFood: db.prepare(`
        INSERT INTO custom_foods (user_id, name, calories, protein, carbs, fat, serving)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `),
    getCustomFoods: db.prepare('SELECT * FROM custom_foods WHERE user_id = ?'),
    deleteCustomFood: db.prepare('DELETE FROM custom_foods WHERE id = ? AND user_id = ?'),

    // Daily entries operations
    insertDailyEntry: db.prepare(`
        INSERT INTO daily_entries (user_id, food_id, name, servings, calories, protein, carbs, fat, date, meal_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    getDailyEntries: db.prepare('SELECT * FROM daily_entries WHERE user_id = ?'),
    deleteDailyEntry: db.prepare('DELETE FROM daily_entries WHERE id = ? AND user_id = ?'),

    // Goals operations
    upsertGoals: db.prepare(`
        INSERT INTO user_goals (user_id, calories, protein, carbs, fat)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            calories = excluded.calories,
            protein = excluded.protein,
            carbs = excluded.carbs,
            fat = excluded.fat,
            updated_at = CURRENT_TIMESTAMP
    `),
    getGoals: db.prepare('SELECT * FROM user_goals WHERE user_id = ?'),

    // Calculator data operations
    upsertCalculatorData: db.prepare(`
        INSERT INTO user_calculator_data (user_id, age, gender, height, height_inches, weight, activity_level, unit_system)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            age = excluded.age,
            gender = excluded.gender,
            height = excluded.height,
            height_inches = excluded.height_inches,
            weight = excluded.weight,
            activity_level = excluded.activity_level,
            unit_system = excluded.unit_system,
            updated_at = CURRENT_TIMESTAMP
    `),
    getCalculatorData: db.prepare('SELECT * FROM user_calculator_data WHERE user_id = ?')
};

// Helper functions for data access
const dbHelpers = {
    createUser(id, username, hashedPassword) {
        try {
            statements.createUser.run(id, username.toLowerCase(), hashedPassword);
            return true;
        } catch (error) {
            console.error('Error creating user:', error);
            return false;
        }
    },

    findUserByUsername(username) {
        try {
            return statements.findUserByUsername.get(username.toLowerCase());
        } catch (error) {
            console.error('Error finding user:', error);
            return null;
        }
    },

    getUserData(userId) {
        try {
            const customFoods = statements.getCustomFoods.all(userId);
            const rawDailyEntries = statements.getDailyEntries.all(userId);
            
            // Map database column names to frontend property names
            const dailyEntries = rawDailyEntries.map(entry => ({
                ...entry,
                mealTime: entry.meal_time,
                foodId: entry.food_id
            }));
            
            const goals = statements.getGoals.get(userId) || {
                calories: 2200,
                protein: 165,
                carbs: 275,
                fat: 73
            };

            // Get calculator data
            const calculatorData = statements.getCalculatorData.get(userId) || {
                age: 25,
                gender: 'male',
                height: 5.83,
                height_inches: 10,
                weight: 165,
                activity_level: 'moderate',
                unit_system: 'imperial'
            };

            return {
                customFoods,
                dailyEntries,
                goals: {
                    calories: goals.calories,
                    protein: goals.protein,
                    carbs: goals.carbs,
                    fat: goals.fat
                },
                calculatorData: {
                    age: calculatorData.age,
                    gender: calculatorData.gender,
                    height: calculatorData.height,
                    heightInches: calculatorData.height_inches,
                    weight: calculatorData.weight,
                    activityLevel: calculatorData.activity_level,
                    unitSystem: calculatorData.unit_system
                }
            };
        } catch (error) {
            console.error('Error getting user data:', error);
            return null;
        }
    },

    saveUserData(userId, data) {
        const { customFoods, dailyEntries, goals, calculatorData } = data;

        try {
            // Start a transaction for atomic operations
            const transaction = db.transaction(() => {
                // Update goals (this is efficient with UPSERT)
                statements.upsertGoals.run(
                    userId,
                    goals.calories,
                    goals.protein,
                    goals.carbs,
                    goals.fat
                );

                // Update calculator data if provided
                if (calculatorData) {
                    statements.upsertCalculatorData.run(
                        userId,
                        calculatorData.age,
                        calculatorData.gender,
                        calculatorData.height,
                        calculatorData.heightInches,
                        calculatorData.weight,
                        calculatorData.activityLevel,
                        calculatorData.unitSystem
                    );
                }

                // For custom foods and daily entries, we'll still do full replace
                // since the frontend sends complete datasets
                // TODO: Optimize to incremental updates when frontend supports it
                
                // Clear existing custom foods and daily entries
                db.prepare('DELETE FROM custom_foods WHERE user_id = ?').run(userId);
                db.prepare('DELETE FROM daily_entries WHERE user_id = ?').run(userId);

                // Insert new custom foods in batch
                if (customFoods && customFoods.length > 0) {
                    for (const food of customFoods) {
                        statements.insertCustomFood.run(
                            userId,
                            food.name,
                            food.calories,
                            food.protein,
                            food.carbs,
                            food.fat,
                            food.serving
                        );
                    }
                }

                // Insert new daily entries in batch
                if (dailyEntries && dailyEntries.length > 0) {
                    for (const entry of dailyEntries) {
                        statements.insertDailyEntry.run(
                            userId,
                            entry.foodId || entry.food_id,
                            entry.name,
                            entry.servings,
                            entry.calories,
                            entry.protein,
                            entry.carbs,
                            entry.fat,
                            entry.date,
                            entry.mealTime || entry.meal_time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        );
                    }
                }
            });

            // Execute the transaction
            transaction();
            return true;
        } catch (error) {
            console.error('Error saving user data:', error);
            return false;
        }
    },

    deleteDailyEntry(userId, entryId) {
        try {
            const result = statements.deleteDailyEntry.run(entryId, userId);
            return result.changes > 0;
        } catch (error) {
            console.error('Error deleting daily entry:', error);
            return false;
        }
    }
};

module.exports = {
    db,
    dbHelpers
}; 
