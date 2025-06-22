import { pool } from '../config/database.js';
import bcrypt from 'bcrypt';
import ActivityLog from './ActivityLog.js';

class User {
    static async create({ username, email, password, preferred_language = 'English', user_type = 'User' }) {
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const [result] = await pool.execute(
                `INSERT INTO users (username, email, password, preferred_language, user_type)
                 VALUES (?, ?, ?, ?, ?)`,
                [username, email, hashedPassword, preferred_language, user_type]
            );

            console.log('[User.create] Inserted user with ID:', result.insertId);
            
            // Log activity after successful user creation
            try {
                await ActivityLog.log(result.insertId, `User registered: ${username}`);
            } catch (logError) {
                console.error('[User.create] Activity log error:', logError);
                // Continue even if activity log fails
            }

            return result.insertId;
        } catch (error) {
            console.error('[User.create] Error:', error.message);
            throw error;
        }
    }

    static async findByEmail(email) {
        try {
            const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
            return rows[0];
        } catch (error) {
            console.error('[findByEmail] Error:', error.message);
            throw error;
        }
    }

    static async findById(id) {
        try {
            const [rows] = await pool.execute(
                'SELECT id, username, email, preferred_language, user_type FROM users WHERE id = ?', [id]
            );
            return rows[0];
        } catch (error) {
            console.error('[findById] Error:', error.message);
            throw error;
        }
    }

    static async updatePreferredLanguage(userId, language) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            await connection.execute(
                'UPDATE users SET preferred_language = ? WHERE id = ?',
                [language, userId]
            );

            await ActivityLog.log(userId, `Updated preferred language to: ${language}`);
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async validatePassword(providedPassword, hashedPassword) {
        return bcrypt.compare(providedPassword, hashedPassword);
    }

    static async getAllUsers() {
        try {
            const [rows] = await pool.execute(
                'SELECT id, username, email, preferred_language, user_type, created_at FROM users'
            );
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async logLogin(userId, username) {
        await ActivityLog.log(userId, `User logged in: ${username}`);
    }

    static async logLogout(userId, username) {
        await ActivityLog.log(userId, `User logged out: ${username}`);
    }

    static async findByUsername(username) {
        try {
            const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
            return rows[0];
        } catch (error) {
            console.error('[findByUsername] Error:', error.message);
            throw error;
        }
    }
}

export default User;
