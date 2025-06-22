import { pool } from '../config/database.js';

class ActivityLog {
    static async log(userId, action) {
        const maxRetries = 3;
        let retryCount = 0;
        
        while (retryCount < maxRetries) {
            try {
                await pool.execute(
                    'INSERT INTO activity_logs (user_id, action) VALUES (?, ?)',
                    [userId, action]
                );
                return;
            } catch (error) {
                if (error.code === 'ER_LOCK_DEADLOCK' || error.code === 'ER_LOCK_WAIT_TIMEOUT') {
                    retryCount++;
                    if (retryCount < maxRetries) {
                        console.log(`[ActivityLog] Retrying... (${retryCount}/${maxRetries})`);
                        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                        continue;
                    }
                }
                console.error('Error logging activity:', error);
                throw error;
            }
        }
    }

    static async getRecentActivities(limit = 50) {
        try {
            const [rows] = await pool.execute(
                `SELECT al.*, u.username 
                FROM activity_logs al 
                JOIN users u ON al.user_id = u.id 
                ORDER BY al.created_at DESC 
                LIMIT ?`,
                [limit]
            );
            return rows;
        } catch (error) {
            console.error('Error getting recent activities:', error);
            throw error;
        }
    }
}

export default ActivityLog; 