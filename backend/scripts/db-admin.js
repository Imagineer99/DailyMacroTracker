const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');
const readline = require('readline');

const dbPath = path.join(__dirname, '..', 'data', 'nutrition.db');
const db = new Database(dbPath);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Admin functions
const adminFunctions = {
    async createAdminUser() {
        console.log('\nCreate Admin User:');
        const username = await question('Enter username: ');
        const password = await question('Enter password: ');
        
        const hashedPassword = await bcrypt.hash(password, 12);
        const userId = 'admin_' + Date.now();
        
        try {
            db.prepare('INSERT INTO users (id, username, password) VALUES (?, ?, ?)').run(userId, username, hashedPassword);
            console.log('Admin user created successfully!');
        } catch (error) {
            console.error('Error creating admin user:', error.message);
        }
    },

    listUsers() {
        try {
            const users = db.prepare('SELECT id, username, created_at FROM users').all();
            console.log('\nUsers in database:');
            console.table(users);
        } catch (error) {
            console.error('Error listing users:', error.message);
        }
    },

    getUserData() {
        const username = db.prepare('SELECT * FROM users').all();
        console.log('\nUser data:');
        console.table(username);
    },

    deleteUser() {
        rl.question('\nEnter username to delete: ', (username) => {
            try {
                db.prepare('DELETE FROM users WHERE username = ?').run(username);
                console.log('User deleted successfully!');
            } catch (error) {
                console.error('Error deleting user:', error.message);
            }
            showMenu();
        });
    },

    backupDatabase() {
        const backup = new Database(path.join(__dirname, '..', 'data', `backup_${Date.now()}.db`));
        db.backup(backup)
            .then(() => {
                console.log('Backup created successfully!');
                backup.close();
            })
            .catch(err => {
                console.error('Backup failed:', err);
                backup.close();
            });
    },

    viewUserEntries() {
        rl.question('\nEnter username to view entries: ', (username) => {
            try {
                const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
                if (user) {
                    const entries = db.prepare('SELECT * FROM daily_entries WHERE user_id = ?').all(user.id);
                    console.log('\nUser entries:');
                    console.table(entries);
                } else {
                    console.log('User not found');
                }
            } catch (error) {
                console.error('Error viewing entries:', error.message);
            }
            showMenu();
        });
    },

    queryCustom() {
        rl.question('\nEnter SQL query: ', (query) => {
            try {
                const result = db.prepare(query).all();
                console.log('\nQuery results:');
                console.table(result);
            } catch (error) {
                console.error('Error executing query:', error.message);
            }
            showMenu();
        });
    }
};

// Helper function for prompts
function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// Menu system
function showMenu() {
    console.log('\n=== Database Admin Tool ===');
    console.log('1. Create Admin User');
    console.log('2. List All Users');
    console.log('3. View User Data');
    console.log('4. Delete User');
    console.log('5. Backup Database');
    console.log('6. View User Entries');
    console.log('7. Run Custom Query');
    console.log('8. Exit');
    
    rl.question('\nSelect an option: ', async (answer) => {
        switch (answer) {
            case '1':
                await adminFunctions.createAdminUser();
                showMenu();
                break;
            case '2':
                adminFunctions.listUsers();
                showMenu();
                break;
            case '3':
                adminFunctions.getUserData();
                showMenu();
                break;
            case '4':
                adminFunctions.deleteUser();
                break;
            case '5':
                adminFunctions.backupDatabase();
                showMenu();
                break;
            case '6':
                adminFunctions.viewUserEntries();
                break;
            case '7':
                adminFunctions.queryCustom();
                break;
            case '8':
                console.log('Goodbye!');
                rl.close();
                db.close();
                process.exit(0);
            default:
                console.log('Invalid option');
                showMenu();
        }
    });
}

// Start the menu
console.log('Connected to database:', dbPath);
showMenu(); 