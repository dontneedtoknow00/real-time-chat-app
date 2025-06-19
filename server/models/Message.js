import pool from '../config/database.js';
import ActivityLog from './ActivityLog.js';
import TranslationService from '../services/translationService.js';

class Message {
    static async create({ chatroom_id, user_id, content, original_language }) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            const [result] = await connection.execute(
                `INSERT INTO messages 
                (chatroom_id, user_id, content, original_language) 
                VALUES (?, ?, ?, ?)`,
                [chatroom_id, user_id, content, original_language]
            );
            
            // Log message creation
            await ActivityLog.log(user_id, `Sent a message in chatroom ID: ${chatroom_id}`);
            
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
                `SELECT m.*, u.username, u.preferred_language 
                FROM messages m 
                JOIN users u ON m.user_id = u.id 
                WHERE m.id = ?`,
                [id]
            );
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async getMessagesByChatroom(chatroomId, userId) {
        try {
            // Get user's preferred language
            const [userRows] = await pool.execute(
                'SELECT preferred_language FROM users WHERE id = ?',
                [userId]
            );
            const userLanguage = userRows[0]?.preferred_language || 'English';

            // Get all messages in the chatroom
            const [messages] = await pool.execute(
                `SELECT m.*, u.username, u.preferred_language as sender_language
                 FROM messages m
                 JOIN users u ON m.user_id = u.id
                 WHERE m.chatroom_id = ?
                 ORDER BY m.created_at ASC`,
                [chatroomId]
            );

            // Translate every message to the user's preferred language
            const translatedMessages = await Promise.all(messages.map(async (message) => {
                const targetLang = TranslationService.getLanguageCode(userLanguage);
                const sourceLang = TranslationService.getLanguageCode(message.sender_language);
                if (sourceLang !== targetLang) {
                    const translatedContent = await TranslationService.translateText(
                        message.content,
                        userLanguage
                    );
                    return {
                        ...message,
                        content: translatedContent,
                        is_translated: true,
                        original_language: message.sender_language
                    };
                }
                return {
                    ...message,
                    is_translated: false
                };
            }));

            return translatedMessages;
        } catch (error) {
            throw error;
        }
    }

    static async updateTranslation(messageId, language, translatedContent, userId) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            const [result] = await connection.execute(
                `INSERT INTO message_translations 
                (message_id, language, translated_content) 
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE translated_content = ?`,
                [messageId, language, translatedContent, translatedContent]
            );
            
            // Log translation update
            await ActivityLog.log(userId, `Updated translation for message ID: ${messageId} to ${language}`);
            
            await connection.commit();
            return result.affectedRows > 0;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getTranslation(messageId, language) {
        try {
            const [rows] = await pool.execute(
                'SELECT translated_content FROM message_translations WHERE message_id = ? AND language = ?',
                [messageId, language]
            );
            return rows[0]?.translated_content;
        } catch (error) {
            throw error;
        }
    }

    static async delete(id, userId) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            await connection.execute('DELETE FROM messages WHERE id = ?', [id]);
            
            // Log message deletion
            await ActivityLog.log(userId, `Deleted message ID: ${id}`);
            
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

export default Message; 