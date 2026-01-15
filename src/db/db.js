// <script src="https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/dexie.min.js"></script>
// <script src="https://cdn.jsdelivr.net/npm/bcryptjs/dist/bcrypt.min.js"></script>

// Initialize Dexie database
const db = new Dexie('StudyFlowDB');

// Define database schema
db.version(1).stores({
    users: '++id, email, password, name, createdAt'
});

// Use global bcrypt from CDN
const bcrypt = window.dcodeIO.bcrypt;

/**
 * Add a new user with hashed password
 * @param {string} email
 * @param {string} password
 * @param {string} name
 * @returns {Promise<number>} ID of the new user
 */
async function addUser(email, password, name) {
    try {
        const existingUser = await db.users.where('email').equals(email.toLowerCase()).first();
        if (existingUser) throw new Error('User with this email already exists');

        //hash
        const hashedPassword = bcrypt.hashSync(password, 10); 
        return await db.users.add({
            email: email.toLowerCase(),
            password: hashedPassword,
            name,
            createdAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error adding user:', error);
        throw error;
    }
}

/**
 * Retrieve a user by email
 * @param {string} email
 * @returns {Promise<Object|undefined>} User object or undefined
 */
async function getUserByEmail(email) {
    try {
        return await db.users.where('email').equals(email.toLowerCase()).first();
    } catch (error) {
        console.error('Error getting user:', error);
        throw error;
    }
}

/**
 * Validate login credentials
 * @param {string} email
 * @param {string} password
 * @returns {Promise<boolean>} True if credentials match
 */
async function validateLogin(email, password) {
    try {
        const user = await getUserByEmail(email);
        if (!user) return false;

        // synchronous compare
        return bcrypt.compareSync(password, user.password);
    } catch (error) {
        console.error('Error validating login:', error);
        throw error;
    }
}

/**
 * Get all users (for admin purposes)
 * @returns {Promise<Array>} Array of user objects
 */
async function getAllUsers() {
    try {
        return await db.users.toArray();
    } catch (error) {
        console.error('Error getting all users:', error);
        throw error;
    }
}

/**
 * Update user information
 * @param {string} email 
 * @param {Object} updates 
 * @returns {Promise<number>}
 */
async function updateUser(email, updates) {
    try {
        if (updates.password) {
            updates.password = bcrypt.hashSync(updates.password, 10);
        }
        return await db.users.where('email').equals(email.toLowerCase()).modify(updates);
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
}

/**
 * Delete a user by email
 * @param {string} email 
 * @returns {Promise<void>}
 */
async function deleteUser(email) {
    try {
        await db.users.where('email').equals(email.toLowerCase()).delete();
    } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
}

/**
 * Clear all users from database
 * @returns {Promise<void>}
 */
async function clearAllUsers() {
    try {
        await db.users.clear();
    } catch (error) {
        console.error('Error clearing users:', error);
        throw error;
    }
}