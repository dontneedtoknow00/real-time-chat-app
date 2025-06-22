import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const poolOptions = {
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: true,
    multipleStatements: true,
    // Add SSL for secure connections to cloud databases like Railway
    ssl: {
        rejectUnauthorized: false
    }
};

let pool;

// This logic prioritizes the DATABASE_URL provided by Railway.
if (process.env.DATABASE_URL) {
    console.log("Connecting to database using DATABASE_URL...");
    pool = mysql.createPool({
        ...poolOptions,
        uri: process.env.DATABASE_URL,
    });
} else {
    // This is the fallback for local development.
    console.log("Connecting to database using local .env variables or defaults...");
    pool = mysql.createPool({
        ...poolOptions,
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'chat_app',
    });
}

// Test the connection and verify database access
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Database connected successfully');
        
        // Test database access
        const [tables] = await connection.query('SHOW TABLES');
        console.log('Available tables:', tables.map(t => Object.values(t)[0]));
        
        // Test users table
        const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
        console.log('Number of users in database:', users[0].count);
        
        // Test chatrooms table
        const [chatrooms] = await connection.query('SELECT COUNT(*) as count FROM chatrooms');
        console.log('Number of chatrooms in database:', chatrooms[0].count);
        
        connection.release();
    } catch (err) {
        console.error('Database connection error:', err);
        console.error('Database configuration being used:', pool.pool.config.connectionConfig);
        process.exit(1); // Exit if database connection fails
    }
}

// Run the test
testConnection();

export { pool }; 