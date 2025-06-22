import { pool } from '../config/database.js';
import ActivityLog from './ActivityLog.js';

class Chatroom {
    static async create({ name, created_by }) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            const [result] = await connection.execute(
                'INSERT INTO chatrooms (name, created_by) VALUES (?, ?)',
                [name, created_by]
            );
            
            // Log chatroom creation
            await ActivityLog.log(created_by, `Created new chatroom: ${name}`);
            
            await connection.commit();
            return result.insertId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async findById(id) {
        try {
            const [rows] = await pool.execute(
                `SELECT c.*, u.username as creator_name 
                FROM chatrooms c 
                JOIN users u ON c.created_by = u.id 
                WHERE c.id = ?`,
                [id]
            );
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async getAllChatrooms() {
        try {
            const [rows] = await pool.execute(
                `SELECT c.*, u.username as creator_name 
                FROM chatrooms c 
                JOIN users u ON c.created_by = u.id 
                ORDER BY c.created_at DESC`
            );
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async delete(id, userId) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            const [chatroom] = await connection.execute(
                'SELECT name FROM chatrooms WHERE id = ?',
                [id]
            );
            
            await connection.execute('DELETE FROM chatrooms WHERE id = ?', [id]);
            
            // Log chatroom deletion
            if (chatroom[0]) {
                await ActivityLog.log(userId, `Deleted chatroom: ${chatroom[0].name}`);
            }
            
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getRecentMessages(chatroomId, limit = 50) {
        try {
            const [rows] = await pool.execute(
                `SELECT m.*, u.username, u.preferred_language 
                FROM messages m 
                JOIN users u ON m.user_id = u.id 
                WHERE m.chatroom_id = ? 
                ORDER BY m.created_at DESC 
                LIMIT ?`,
                [chatroomId, limit]
            );
            return rows.reverse(); // Return in chronological order
        } catch (error) {
            throw error;
        }
    }
}

export default Chatroom; 