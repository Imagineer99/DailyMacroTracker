# Fitness Tracker React

A modern nutrition and fitness tracking application built with React and Node.js.

## Features

- Custom food database
- Daily meal tracking
- Nutritional goals tracking
- Secure user authentication
- Admin dashboard for data management
- Encrypted data storage
- Automated backup system

## Tech Stack

- **Frontend**: React, TypeScript
- **Backend**: Node.js, Express
- **Database**: SQLite with encryption
- **Authentication**: JWT
- **Security**: bcrypt, helmet, rate-limiting

## Current Status

The application has core functionality implemented and is suitable for development/testing use. Below is the roadmap for production readiness:

### ✅ Production Ready Components

1. **Database Structure**
   - SQLite implementation (suitable for 100+ users)
   - Proper schema with relationships
   - Data encryption at rest
   - Secure file permissions

2. **Security Features**
   - Password hashing with bcrypt
   - JWT authentication
   - Rate limiting
   - Helmet security headers
   - Access logging
   - Backup system

3. **Basic Architecture**
   - API endpoints structure
   - User authentication flow
   - Data persistence

### 🔧 Pre-Production Checklist

1. **Deployment Setup** (High Priority)
   - [ ] Hosting solution setup
   - [ ] Domain name and SSL certificate
   - [ ] Environment variables configuration
   - [ ] Production CORS configuration

2. **Error Handling & Logging** (High Priority)
   - [ ] Centralized error handling
   - [ ] Production logging system
   - [ ] Server health monitoring

3. **Data Validation** (High Priority)
   - [ ] Input validation on all endpoints
   - [ ] User input sanitization
   - [ ] Request size limits

4. **Testing** (Medium Priority)
   - [ ] Unit tests
   - [ ] Integration tests
   - [ ] Load testing

5. **User Features** (Medium Priority)
   - [ ] Password reset flow
   - [ ] Email verification
   - [ ] Account deletion
   - [ ] Data export (GDPR compliance)

6. **Performance** (Low Priority for 100 users)
   - [ ] Caching strategy
   - [ ] Query optimization
   - [ ] Rate limiting fine-tuning

7. **DevOps** (Medium Priority)
   - [ ] CI/CD pipeline
   - [ ] Automated backups
   - [ ] Monitoring and alerts
   - [ ] Deployment automation

## Development Timeline
- Essential Production Ready (High Priority items): 1-2 weeks
- Fully Production Ready (All items): 3-4 weeks

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone [repository-url]
```

2. Install frontend dependencies
```bash
cd frontend
npm install
```

3. Install backend dependencies
```bash
cd backend
npm install
```

4. Start the development servers
```bash
# Terminal 1 - Frontend
cd frontend
npm start

# Terminal 2 - Backend
cd backend
npm start
```

### Database Access and Management

#### Database Location
The SQLite database file (`nutrition.db`) is located in the `backend/data` directory. This file contains all application data including user accounts, food entries, and nutritional goals.

#### Accessing the Database

1. **Using the Admin CLI Tool**
```bash
cd backend
npm run admin
```
This provides an interactive interface for:
- Viewing and managing user accounts
- Inspecting food entries
- Managing nutritional goals
- Running custom SQL queries
- Creating database backups

2. **Using DB Browser for SQLite**
For visual database inspection:
- Download [DB Browser for SQLite](https://sqlitebrowser.org/)
- Open `backend/data/nutrition.db`
- Browse tables, run queries, and inspect data

#### Database Security
The database implements several security measures:
- File encryption for data at rest
- Access logging for all operations
- Automated daily backups in `backend/data/backups`
- Strict file permissions
- Log rotation for access logs

#### Database Schema
The database contains the following main tables:
- `users`: User account information
- `custom_foods`: User-saved food items
- `daily_entries`: Food log entries
- `user_goals`: Nutritional targets and goals

#### Backup and Recovery
- Automated backups run daily
- Backup files are stored in `backend/data/backups`
- To restore from backup, use the admin tool:
```bash
cd backend
npm run admin
# Select 'Restore from backup' option
```

## Technology Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Fast build tool
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **PostCSS** - CSS processing
- **SQLITE** - Database
- **EXPRESS** - Backend

## Future Scalability

The current SQLite implementation is suitable for the initial user base. When needed, the database can be migrated to PostgreSQL for increased scalability without major code changes.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the ISC License - see the [LICENSE.md](LICENSE.md) file for details 


## Security

The implementation is quite secure, but for production, we'll need to:
- Set a strong JWT_SECRET in environment variables
- Configure proper CORS settings for your production domain
- Consider implementing refresh tokens for better security
- Maybe add token blacklisting for logged-out tokens