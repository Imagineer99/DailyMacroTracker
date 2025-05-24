# Nutrition Tracker Backend API

A secure Express.js backend for the Nutrition Tracker application with JWT authentication and proper password hashing.

## Features

- 🔐 **JWT Authentication** - Secure token-based authentication
- 🔒 **Password Hashing** - BCrypt with salt rounds for security
- 🛡️ **Security Middleware** - Helmet, CORS, Rate limiting
- 📁 **File-based Storage** - JSON files (easily upgradeable to database)
- 🚀 **Production Ready** - Security best practices implemented

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### User Data (Protected)
- `GET /api/user/data` - Get user's nutrition data
- `POST /api/user/data` - Save user's nutrition data

### Health Check
- `GET /api/health` - Server health status

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment** (optional)
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Start production server**
   ```bash
   npm start
   ```

## Security Features

- **Rate Limiting**: 100 requests/15min general, 5 auth requests/15min
- **Password Hashing**: BCrypt with 12 salt rounds
- **JWT Tokens**: 7-day expiration
- **CORS Protection**: Configured for localhost development
- **Helmet Security**: HTTP security headers
- **Input Validation**: Username/password requirements

## Data Structure

User data is stored in JSON files:
- `data/users.json` - User accounts
- `data/user_{id}.json` - Individual user nutrition data

## Environment Variables

- `PORT` - Server port (default: 3001)
- `JWT_SECRET` - JWT signing secret (required for production)
- `NODE_ENV` - Environment (development/production)
- `FRONTEND_URL` - Frontend URL for CORS

## Migration Path

This backend is designed to easily migrate to:
- Database storage (PostgreSQL, MongoDB, etc.)
- Cloud hosting (Vercel, Railway, Heroku)
- Advanced features (email verification, password reset)

## Development Notes

- Uses file-based storage for simplicity
- Production-ready security measures
- Easily scalable architecture
- Comprehensive error handling 