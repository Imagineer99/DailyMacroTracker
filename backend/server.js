const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow serving React app
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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: 'Too many authentication attempts, please try again later.'
});

// CORS configuration - now more restrictive since we're serving frontend
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5173', 'http://localhost:3001'],
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

// Data file paths
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    // Initialize users file if it doesn't exist
    try {
      await fs.access(USERS_FILE);
    } catch {
      await fs.writeFile(USERS_FILE, JSON.stringify([], null, 2));
    }
  } catch (error) {
    console.error('Failed to create data directory:', error);
  }
}

// Load users from file
async function loadUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load users:', error);
    return [];
  }
}

// Save users to file
async function saveUsers(users) {
  try {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to save users:', error);
    return false;
  }
}

// Load user data (nutrition entries, custom foods, goals)
async function loadUserData(userId) {
  const userDataFile = path.join(DATA_DIR, `user_${userId}.json`);
  try {
    const data = await fs.readFile(userDataFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Return default data structure if file doesn't exist
    return {
      customFoods: [],
      dailyEntries: [],
      goals: {
        calories: 2200,
        protein: 165,
        carbs: 275,
        fat: 73
      }
    };
  }
}

// Save user data
async function saveUserData(userId, data) {
  const userDataFile = path.join(DATA_DIR, `user_${userId}.json`);
  try {
    await fs.writeFile(userDataFile, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to save user data:', error);
    return false;
  }
}

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
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Load existing users
    const users = await loadUsers();

    // Check if user already exists
    const existingUser = users.find(user => user.username.toLowerCase() === username.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = {
      id: Date.now().toString(),
      username: username.toLowerCase(),
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    // Save user
    users.push(newUser);
    const saved = await saveUsers(users);

    if (!saved) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: newUser.id,
        username: newUser.username
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Basic validation
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Load users
    const users = await loadUsers();

    // Find user
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Protected routes for nutrition data
app.get('/api/user/data', authenticateToken, async (req, res) => {
  try {
    const userData = await loadUserData(req.user.id);
    res.json(userData);
  } catch (error) {
    console.error('Failed to load user data:', error);
    res.status(500).json({ error: 'Failed to load user data' });
  }
});

app.post('/api/user/data', authenticateToken, async (req, res) => {
  try {
    const { customFoods, dailyEntries, goals } = req.body;
    
    const userData = {
      customFoods: customFoods || [],
      dailyEntries: dailyEntries || [],
      goals: goals || { calories: 2200, protein: 165, carbs: 275, fat: 73 }
    };

    const saved = await saveUserData(req.user.id, userData);
    
    if (!saved) {
      return res.status(500).json({ error: 'Failed to save user data' });
    }

    res.json({ message: 'Data saved successfully' });
  } catch (error) {
    console.error('Failed to save user data:', error);
    res.status(500).json({ error: 'Failed to save user data' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
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
  await ensureDataDir();
  
  const buildExists = await checkBuildExists();
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Nutrition Tracker API ready`);
    console.log(`🔒 Authentication enabled`);
    if (buildExists) {
      console.log(`🌐 Frontend served at http://localhost:${PORT}`);
    } else {
      console.log(`⚠️  Frontend build missing - run "npm run build" first`);
    }
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
}); 