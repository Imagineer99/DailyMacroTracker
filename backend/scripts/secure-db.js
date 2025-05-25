const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'nutrition.db');
const KEY_FILE = path.join(DATA_DIR, '.key');
const ACCESS_LOG = path.join(DATA_DIR, 'access.log');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Create access log if it doesn't exist
if (!fs.existsSync(ACCESS_LOG)) {
    fs.writeFileSync(ACCESS_LOG, '');
}

// Set strict permissions on database files
function secureFiles() {
    try {
        // 600 permission = owner read/write only
        fs.chmodSync(DB_FILE, 0o600);
        fs.chmodSync(KEY_FILE, 0o600);
        fs.chmodSync(ACCESS_LOG, 0o600);
        
        console.log('✅ File permissions secured');
    } catch (error) {
        console.error('Error setting file permissions:', error);
    }
}

// Log access attempts
function logAccess(action, success, details = '') {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} | ${action} | ${success ? 'SUCCESS' : 'FAILED'} | ${details}\n`;
    
    fs.appendFileSync(ACCESS_LOG, logEntry);
}

// Backup database
function createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(DATA_DIR, `backup_${timestamp}.db`);
    
    try {
        fs.copyFileSync(DB_FILE, backupFile);
        fs.chmodSync(backupFile, 0o600);
        console.log(`✅ Backup created: ${backupFile}`);
        logAccess('BACKUP', true, `File: ${backupFile}`);
    } catch (error) {
        console.error('Backup failed:', error);
        logAccess('BACKUP', false, error.message);
    }
}

// Rotate logs
function rotateLogs() {
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    try {
        const stats = fs.statSync(ACCESS_LOG);
        
        if (stats.size > maxSize) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const archiveLog = path.join(DATA_DIR, `access_${timestamp}.log`);
            
            fs.renameSync(ACCESS_LOG, archiveLog);
            fs.writeFileSync(ACCESS_LOG, '');
            fs.chmodSync(ACCESS_LOG, 0o600);
            
            console.log(`✅ Log rotated to: ${archiveLog}`);
        }
    } catch (error) {
        console.error('Log rotation failed:', error);
    }
}

// Main security setup
function setupSecurity() {
    console.log('🔒 Setting up database security...');
    
    // Secure files
    secureFiles();
    
    // Create initial backup
    createBackup();
    
    // Set up log rotation
    setInterval(rotateLogs, 24 * 60 * 60 * 1000); // Check daily
    
    console.log(`
Database Security Setup Complete:
-------------------------------
✅ Database location: ${DB_FILE}
✅ Access logging enabled
✅ File permissions secured
✅ Daily log rotation configured
✅ Backup system ready

Security Recommendations:
------------------------
1. Keep the .key file secure and backed up
2. Monitor access.log for suspicious activity
3. Run regular backups
4. Use the admin tool only from secure locations
5. Consider setting up remote backup
`);
}

// Run security setup
setupSecurity(); 