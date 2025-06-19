import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function testConnection() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true
    });

    try {
        // Create database if it doesn't exist
        await connection.query('CREATE DATABASE IF NOT EXISTS chat_app');
        await connection.query('USE chat_app');

        // Read and execute the SQL file
        const sqlFile = fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf8');
        await connection.query(sqlFile);

        // Verify tables
        const [tables] = await connection.query('SHOW TABLES');
        console.log('Tables in database:', tables);

        // Insert test data
        await connection.query(`
            INSERT INTO users (username, email, password, preferred_language, user_type)
            VALUES ('testuser', 'test@example.com', '$2b$10$8KvHGVxr8zxLXz3ydR5PB.Qq7riXVMP5.vzuPGVGQ5jPeHkzqHpK2', 'English', 'User')
            ON DUPLICATE KEY UPDATE username = username;
        `);

        // Verify data
        const [users] = await connection.query('SELECT * FROM users');
        console.log('Users in database:', users);

        // Verify activity logs
        const [activityLogs] = await connection.query('SELECT * FROM activity_logs');
        console.log('Activity logs in database:', activityLogs);

        // Verify chatrooms
        const [chatrooms] = await connection.query('SELECT * FROM chatrooms');
        console.log('Chatrooms in database:', chatrooms);

        console.log('Database setup completed successfully!');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

testConnection(); 