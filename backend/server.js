const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const fs = require('fs').promises;
const path = require('path');
const { dbHelpers } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Change in production

// Authentication error messages
const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Incorrect password. Please check your password and try again.',
  RATE_LIMIT: 'Too many login attempts. For security reasons, please wait 5 minutes before trying again.',
  USERNAME_EXISTS: 'This username is already taken. Please choose a different one.',
  NETWORK_ERROR: 'Unable to connect to server. Please check your internet connection.',
  VALIDATION: {
    REQUIRED_FIELDS: 'Username and password are required',
    USERNAME_LENGTH: 'Username must be at least 3 characters long',
    PASSWORD_LENGTH: 'Password must be at least 6 characters long'
  }
};

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for React
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow React dev tools
}));
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Auth rate limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: { error: AUTH_ERRORS.RATE_LIMIT },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// CORS configuration - now more restrictive since we're serving frontend
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? true  // Allow requests from the same origin in production
    : ['http://localhost:5173', 'http://localhost:3001', 'http://167.99.41.134:5173'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Serve static files from React build (production)
const buildPath = path.join(__dirname, '..', 'dist');
const indexPath = path.join(buildPath, 'index.html');

// Check if build exists
const checkBuildExists = async () => {
  try {
    await fs.access(buildPath);
    console.log('✅ React build found - serving frontend');
    return true;
  } catch {
    console.log('⚠️  React build not found - run "npm run build" first');
    return false;
  }
};

// Serve React app static files
app.use(express.static(buildPath));

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Auth routes
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Basic validation
    if (!username || !password) {
      return res.status(400).json({ error: AUTH_ERRORS.VALIDATION.REQUIRED_FIELDS });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: AUTH_ERRORS.VALIDATION.USERNAME_LENGTH });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: AUTH_ERRORS.VALIDATION.PASSWORD_LENGTH });
    }

    // Check if user exists
    const existingUser = dbHelpers.findUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({ error: AUTH_ERRORS.USERNAME_EXISTS });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const userId = Date.now().toString();
    const success = dbHelpers.createUser(userId, username, hashedPassword);

    if (!success) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: userId, username: username.toLowerCase() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: userId,
        username: username.toLowerCase()
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: AUTH_ERRORS.NETWORK_ERROR });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Basic validation
    if (!username || !password) {
      return res.status(400).json({ error: AUTH_ERRORS.VALIDATION.REQUIRED_FIELDS });
    }

    // Find user
    const user = dbHelpers.findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: AUTH_ERRORS.INVALID_CREDENTIALS });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: AUTH_ERRORS.INVALID_CREDENTIALS });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: AUTH_ERRORS.NETWORK_ERROR });
  }
});

// Protected routes for nutrition data
app.get('/api/user/data', authenticateToken, async (req, res) => {
  try {
    const userData = dbHelpers.getUserData(req.user.id);
    if (!userData) {
      return res.status(500).json({ error: 'Failed to load user data' });
    }
    res.json(userData);
  } catch (error) {
    console.error('Failed to load user data:', error);
    res.status(500).json({ error: 'Failed to load user data' });
  }
});

app.post('/api/user/data', authenticateToken, async (req, res) => {
  try {
    const { customFoods, dailyEntries, goals, calculatorData } = req.body;
    
    // Basic validation for data structure
    if (customFoods && !Array.isArray(customFoods)) {
      return res.status(400).json({ error: 'Custom foods must be an array' });
    }
    
    if (dailyEntries && !Array.isArray(dailyEntries)) {
      return res.status(400).json({ error: 'Daily entries must be an array' });
    }
    
    if (goals && typeof goals !== 'object') {
      return res.status(400).json({ error: 'Goals must be an object' });
    }
    
    if (calculatorData && typeof calculatorData !== 'object') {
      return res.status(400).json({ error: 'Calculator data must be an object' });
    }
    
    // Validate goals if provided
    if (goals) {
      const { calories, protein, carbs, fat } = goals;
      if (calories && (typeof calories !== 'number' || calories < 0 || calories > 10000)) {
        return res.status(400).json({ error: 'Invalid calorie goal' });
      }
      if (protein && (typeof protein !== 'number' || protein < 0 || protein > 500)) {
        return res.status(400).json({ error: 'Invalid protein goal' });
      }
      if (carbs && (typeof carbs !== 'number' || carbs < 0 || carbs > 1000)) {
        return res.status(400).json({ error: 'Invalid carbs goal' });
      }
      if (fat && (typeof fat !== 'number' || fat < 0 || fat > 300)) {
        return res.status(400).json({ error: 'Invalid fat goal' });
      }
    }
    
    // Validate custom foods if provided
    if (customFoods && customFoods.length > 0) {
      for (const food of customFoods) {
        if (!food.name || typeof food.name !== 'string' || food.name.trim().length < 2) {
          return res.status(400).json({ error: 'Invalid food name' });
        }
        if (typeof food.calories !== 'number' || food.calories < 0 || food.calories > 9000) {
          return res.status(400).json({ error: 'Invalid calories value' });
        }
        if (typeof food.protein !== 'number' || food.protein < 0 || food.protein > 100) {
          return res.status(400).json({ error: 'Invalid protein value' });
        }
        if (typeof food.carbs !== 'number' || food.carbs < 0 || food.carbs > 100) {
          return res.status(400).json({ error: 'Invalid carbs value' });
        }
        if (typeof food.fat !== 'number' || food.fat < 0 || food.fat > 100) {
          return res.status(400).json({ error: 'Invalid fat value' });
        }
      }
    }
    
    // Validate calculator data if provided
    if (calculatorData) {
      const { age, gender, height, heightInches, weight, activityLevel, unitSystem } = calculatorData;
      if (age && (typeof age !== 'number' || age < 15 || age > 80)) {
        return res.status(400).json({ error: 'Invalid age value' });
      }
      if (gender && !['male', 'female'].includes(gender)) {
        return res.status(400).json({ error: 'Invalid gender value' });
      }
      if (height && (typeof height !== 'number' || height < 0)) {
        return res.status(400).json({ error: 'Invalid height value' });
      }
      if (heightInches && (typeof heightInches !== 'number' || heightInches < 0 || heightInches > 11)) {
        return res.status(400).json({ error: 'Invalid height inches value' });
      }
      if (weight && (typeof weight !== 'number' || weight < 0)) {
        return res.status(400).json({ error: 'Invalid weight value' });
      }
      if (activityLevel && !['sedentary', 'light', 'moderate', 'active', 'veryActive'].includes(activityLevel)) {
        return res.status(400).json({ error: 'Invalid activity level value' });
      }
      if (unitSystem && !['imperial', 'metric'].includes(unitSystem)) {
        return res.status(400).json({ error: 'Invalid unit system value' });
      }
    }
    
    const success = dbHelpers.saveUserData(req.user.id, {
      customFoods: customFoods || [],
      dailyEntries: dailyEntries || [],
      goals: goals || { calories: 2200, protein: 165, carbs: 275, fat: 73 },
      calculatorData: calculatorData
    });

    if (!success) {
      return res.status(500).json({ error: 'Failed to save user data' });
    }

    res.json({ message: 'Data saved successfully' });
  } catch (error) {
    console.error('Failed to save user data:', error);
    res.status(500).json({ error: 'Failed to save user data' });
  }
});

// Delete specific daily entry endpoint
app.delete('/api/user/daily-entry/:entryId', authenticateToken, async (req, res) => {
  try {
    const entryId = parseInt(req.params.entryId);
    
    if (isNaN(entryId)) {
      return res.status(400).json({ error: 'Invalid entry ID' });
    }
    
    const success = dbHelpers.deleteDailyEntry(req.user.id, entryId);
    
    if (!success) {
      return res.status(404).json({ error: 'Entry not found or could not be deleted' });
    }
    
    res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('Failed to delete daily entry:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Serve React app for all non-API routes (SPA routing)
app.get('/', async (req, res) => {
  try {
    const buildExists = await checkBuildExists();
    if (buildExists) {
      res.sendFile(indexPath);
    } else {
      res.status(503).json({ 
        error: 'Frontend not built yet', 
        message: 'Run "npm run build" in the main project directory first' 
      });
    }
  } catch (error) {
    console.error('Error serving frontend:', error);
    res.status(500).json({ error: 'Failed to serve frontend' });
  }
});

// Catch-all handler: send back React's index.html file for client-side routing
app.get(/^(?!\/api).*$/, async (req, res) => {
  try {
    const buildExists = await checkBuildExists();
    if (buildExists) {
      res.sendFile(indexPath);
    } else {
      res.status(503).json({ 
        error: 'Frontend not built yet', 
        message: 'Run "npm run build" in the main project directory first' 
      });
    }
  } catch (error) {
    console.error('Error serving frontend:', error);
    res.status(500).json({ error: 'Failed to serve frontend' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize server
async function startServer() {
  const buildExists = await checkBuildExists();
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
