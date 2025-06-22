import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import Message from './models/Message.js';
import User from './models/User.js';
import TranslationService from './services/translationService.js';
import { pool } from './config/database.js';
import ActivityLog from './models/ActivityLog.js';
import Chatroom from './models/Chatroom.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Railway deployment trigger - updated dependencies
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Use environment variable for port (Render requirement)
const PORT = process.env.PORT || 3000;

const ADMIN = 'Admin';

// --- Hardcoded preferred languages ---
const userPreferredLanguages = {
  'userA': 'en', // English for User A
  'userB': 'zh', // Chinese for User B
};

// --- Translation function ---
async function translateText(text, targetLang) {
  try {
    const res = await axios.post('https://translate.argosopentech.com/translate', {
      q: text,
      source: 'auto',
      target: targetLang,
      format: 'text',
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    return res.data.translatedText;
  } catch (err) {
    console.error('Translation error:', err.message);
    return text;  // Return the original text in case of error
  }
}

// --- Users state management ---
const UsersState = {
  users: [],
  setUsers(newUsersArray) {
    this.users = newUsersArray;
  },
};

io.on('connection', (socket) => {
  console.log(`User ${socket.id} connected`);

  socket.emit('message', buildMsg(ADMIN, 'Welcome to Chat App!'));

  socket.on('enterRoom', async ({ name, room }) => {
    const prevRoom = getUser(socket.id)?.room;

    if (prevRoom) {
      socket.leave(prevRoom);
      io.to(prevRoom).emit(
        'message',
        buildMsg(ADMIN, `${name} has left the room`)
      );
    }

    const user = activateUser(socket.id, name, room);
    socket.username = name;

    if (prevRoom) {
      io.to(prevRoom).emit('userList', {
        users: getUsersInRoom(prevRoom),
      });
    }

    socket.join(user.room);

    socket.emit(
      'message',
      buildMsg(ADMIN, `You have joined the ${user.room} chat room`)
    );

    socket.broadcast
      .to(user.room)
      .emit('message', buildMsg(ADMIN, `${user.name} has joined the room`));

    io.to(user.room).emit('userList', {
      users: getUsersInRoom(user.room),
    });

    io.emit('roomList', {
      rooms: getAllActiveRooms(),
    });

    // Send all previous messages in the room, translated to this user's preferred language
    try {
      // Find userId from DB
      const dbUser = await User.findByUsername(name); // Use username directly
      console.log('[enterRoom] dbUser:', dbUser);
      if (dbUser) {
        const messages = await Message.getMessagesByChatroom(room, dbUser.id);
        messages.forEach(msg => {
          socket.emit('message', {
            name: msg.username,
            text: msg.content,
            time: new Intl.DateTimeFormat('default', {
              hour: 'numeric',
              minute: 'numeric',
              second: 'numeric',
            }).format(new Date(msg.created_at)),
          });
        });
      }
    } catch (err) {
      console.error('Error sending previous messages:', err);
    }
  });

  socket.on('message', async ({ name, text }) => {
    const room = getUser(socket.id)?.room;
    if (!room) return;

    try {
        // Find userId from DB
        const [dbUsers] = await pool.execute('SELECT * FROM users WHERE username = ?', [name]);
        const dbUser = dbUsers[0];
        if (!dbUser) {
            console.error('User not found:', name);
            return;
        }

        // Find chatroom ID from name
        const [chatrooms] = await pool.execute('SELECT * FROM chatrooms WHERE name = ?', [room]);
        const chatroom = chatrooms[0];
        if (!chatroom) {
            console.error('Chatroom not found:', room);
            return;
        }

        // Save the message in the DB
        const [messageResult] = await pool.execute(
            'INSERT INTO messages (chatroom_id, user_id, content, original_language, created_at) VALUES (?, ?, ?, ?, ?)',
            [chatroom.id, dbUser.id, text, dbUser.preferred_language, new Date()]
        );

        // For each user in the room, send the message translated to their preferred language
        const usersInRoom = getUsersInRoom(room);
        for (const u of usersInRoom) {
            // Find DB user for preferred language
            const [recipientUsers] = await pool.execute('SELECT * FROM users WHERE username = ?', [u.name]);
            const dbU = recipientUsers[0];
            
            let translatedText = text;
            if (dbU && dbU.preferred_language !== dbUser.preferred_language) {
                // Use sender's preferred_language as source, recipient's as target
                translatedText = await TranslationService.translateText(
                    text,
                    dbU.preferred_language,
                    dbUser.preferred_language
                );
            }
            
            io.to(u.id).emit('message', {
                name,
                text: translatedText,
                time: new Intl.DateTimeFormat('default', {
                    hour: 'numeric',
                    minute: 'numeric',
                    second: 'numeric',
                }).format(new Date()),
            });
        }
    } catch (error) {
        console.error('Error handling message:', error);
    }
  });

  socket.on('activity', (name) => {
    const room = getUser(socket.id)?.room;
    if (room) {
      socket.broadcast.to(room).emit('activity', name);
    }
  });

  socket.on('disconnect', () => {
    const user = getUser(socket.id);
    userLeavesApp(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        buildMsg(ADMIN, `${user.name} has left the room`)
      );

      io.to(user.room).emit('userList', {
        users: getUsersInRoom(user.room),
      });

      io.emit('roomList', {
        rooms: getAllActiveRooms(),
      });
    }

    console.log(`User ${socket.id} disconnected`);
  });
});

// --- Helper functions ---
function buildMsg(name, text) {
  return {
    name,
    text,
    time: new Intl.DateTimeFormat('default', {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    }).format(new Date()),
  };
}

function activateUser(id, name, room) {
  const user = { id, name, room };
  UsersState.setUsers([
    ...UsersState.users.filter((user) => user.id !== id),
    user,
  ]);
  return user;
}

function userLeavesApp(id) {
  UsersState.setUsers(UsersState.users.filter((user) => user.id !== id));
}

function getUser(id) {
  return UsersState.users.find((user) => user.id === id);
}

function getUsersInRoom(room) {
  return UsersState.users.filter((user) => user.room === room);
}

function getAllActiveRooms() {
  return Array.from(new Set(UsersState.users.map((user) => user.room)));
}

// Registration endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, language, accountType } = req.body;
    const userId = await User.create({
      username,
      email,
      password,
      preferred_language: language,
      user_type: accountType
    });
    res.json({ success: true, userId });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Initialize default chatrooms
async function initializeChatrooms() {
  try {
    const [existingRooms] = await pool.execute('SELECT name FROM chatrooms');
    const existingRoomNames = existingRooms.map(room => room.name);
    
    const defaultRooms = ['Green', 'Blue', 'New'];
    for (const roomName of defaultRooms) {
      if (!existingRoomNames.includes(roomName)) {
        await pool.execute(
          'INSERT INTO chatrooms (name, created_by) VALUES (?, ?)',
          [roomName, 11] // Using admin user ID (11) as creator
        );
        console.log(`Created chatroom: ${roomName}`);
      }
    }
  } catch (error) {
    console.error('Error initializing chatrooms:', error);
  }
}

// Call this when server starts
initializeChatrooms();

// Database connection verification
async function verifyDatabaseConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('=== DATABASE CONNECTION VERIFICATION ===');
        
        // Check users table
        const [users] = await connection.execute('SELECT * FROM users');
        console.log('Users in database:', users);
        
        // Check chatrooms table
        const [chatrooms] = await connection.execute('SELECT * FROM chatrooms');
        console.log('Chatrooms in database:', chatrooms);
        
        connection.release();
    } catch (error) {
        console.error('Database connection error:', error);
    }
}

// Call this when server starts
verifyDatabaseConnection();

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store'); // Prevent caching
        const [users] = await pool.execute(
            'SELECT id, username, email, preferred_language, user_type FROM users'
        );
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get all chatrooms
app.get('/api/chatrooms', async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store'); // Prevent caching
        const [chatrooms] = await pool.execute(
            'SELECT * FROM chatrooms ORDER BY created_at DESC'
        );
        res.json(chatrooms);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch chatrooms' });
    }
});

// Create new user
app.post('/api/users', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { username, email, password, preferred_language, user_type } = req.body;
        console.log('=== USER CREATION REQUEST ===');
        console.log('Request body:', { username, email, preferred_language, user_type });
        
        // Validate required fields
        if (!username || !email || !password) {
            console.error('Missing required fields');
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if user already exists
        const [existingUsers] = await connection.execute(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, email]
        );
        
        if (existingUsers.length > 0) {
            console.log('User already exists:', existingUsers[0]);
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Password hashed successfully');

        // Start transaction
        await connection.beginTransaction();
        console.log('Transaction started');

        // Create new user
        const [result] = await connection.execute(
            'INSERT INTO users (username, email, password, preferred_language, user_type) VALUES (?, ?, ?, ?, ?)',
            [username, email, hashedPassword, preferred_language || 'en', user_type || 'User']
        );
        console.log('User created successfully with ID:', result.insertId);

        // Verify user was created
        const [newUser] = await connection.execute(
            'SELECT id, username, email, preferred_language, user_type FROM users WHERE id = ?',
            [result.insertId]
        );
        console.log('Verified new user:', newUser[0]);

        // Log the activity
        await connection.execute(
            'INSERT INTO activity_logs (user_id, action, details, timestamp) VALUES (?, ?, ?, ?)',
            [result.insertId, 'CREATE_USER', `Created new user: ${username}`, new Date()]
        );
        console.log('Activity logged successfully');

        // Commit transaction
        await connection.commit();
        console.log('Transaction committed');

        res.status(201).json({ 
            success: true, 
            userId: result.insertId,
            user: newUser[0],
            message: 'User created successfully'
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
            console.error('Transaction rolled back due to error:', error);
        }
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user: ' + error.message });
    } finally {
        if (connection) {
            connection.release();
            console.log('Database connection released');
        }
    }
});

// Create new chatroom
app.post('/api/chatrooms', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { name, description } = req.body;
        console.log('=== CHATROOM CREATION REQUEST ===');
        console.log('Request body:', { name, description });
        
        // Check if chatroom already exists
        const [existingRooms] = await connection.execute(
            'SELECT * FROM chatrooms WHERE name = ?',
            [name]
        );
        
        if (existingRooms.length > 0) {
            console.log('Chatroom already exists:', name);
            return res.status(400).json({ error: 'Chatroom already exists' });
        }

        // Get admin user ID
        const [adminUsers] = await connection.execute(
            'SELECT id FROM users WHERE user_type = "Admin" LIMIT 1'
        );
        const adminId = adminUsers[0]?.id || 1;
        console.log('Using admin ID:', adminId);

        // Start transaction
        await connection.beginTransaction();
        console.log('Transaction started');

        // Create new chatroom
        const [result] = await connection.execute(
            'INSERT INTO chatrooms (name, description, created_by, created_at) VALUES (?, ?, ?, ?)',
            [name, description, adminId, new Date()]
        );
        console.log('Chatroom created successfully with ID:', result.insertId);

        // Log the activity
        await connection.execute(
            'INSERT INTO activity_logs (user_id, action, details, timestamp) VALUES (?, ?, ?, ?)',
            [adminId, 'CREATE_CHATROOM', `Created new chatroom: ${name}`, new Date()]
        );
        console.log('Activity logged successfully');

        // Commit transaction
        await connection.commit();
        console.log('Transaction committed');

        res.status(201).json({ 
            success: true, 
            chatroomId: result.insertId,
            message: 'Chatroom created successfully'
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
            console.error('Transaction rolled back due to error:', error);
        }
        console.error('Error creating chatroom:', error);
        res.status(500).json({ error: 'Failed to create chatroom: ' + error.message });
    } finally {
        if (connection) {
            connection.release();
            console.log('Database connection released');
        }
    }
});

// Get user by username
app.get('/api/users/:username', async (req, res) => {
    try {
        const [users] = await pool.execute(
            'SELECT id, username, email, preferred_language, user_type FROM users WHERE username = ?',
            [req.params.username]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(users[0]);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// Update user
app.put('/api/users/:username', async (req, res) => {
    try {
        const { username, email, password, preferred_language, user_type } = req.body;
        
        // If password is provided, hash it
        let hashedPassword;
        if (password) {
            hashedPassword = await bcrypt.hash(password, 10);
        }
        
        // Build update query based on provided fields
        const updates = [];
        const values = [];
        
        if (username) {
            updates.push('username = ?');
            values.push(username);
        }
        if (email) {
            updates.push('email = ?');
            values.push(email);
        }
        if (hashedPassword) {
            updates.push('password = ?');
            values.push(hashedPassword);
        }
        if (preferred_language) {
            updates.push('preferred_language = ?');
            values.push(preferred_language);
        }
        if (user_type) {
            updates.push('user_type = ?');
            values.push(user_type);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        
        values.push(req.params.username);
        
        const [result] = await pool.execute(
            `UPDATE users SET ${updates.join(', ')} WHERE username = ?`,
            values
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ success: true, message: 'User updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Delete user
app.delete('/api/users/:username', async (req, res) => {
    try {
        const [result] = await pool.execute(
            'DELETE FROM users WHERE username = ?',
            [req.params.username]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Get chatroom by name
app.get('/api/chatrooms/:name', async (req, res) => {
    try {
        const [chatrooms] = await pool.execute(
            'SELECT * FROM chatrooms WHERE name = ?',
            [req.params.name]
        );
        
        if (chatrooms.length === 0) {
            return res.status(404).json({ error: 'Chatroom not found' });
        }
        
        res.json(chatrooms[0]);
    } catch (error) {
        console.error('Error fetching chatroom:', error);
        res.status(500).json({ error: 'Failed to fetch chatroom' });
    }
});

// Update chatroom
app.put('/api/chatrooms/:name', async (req, res) => {
    try {
        const { name, description } = req.body;
        
        const [result] = await pool.execute(
            'UPDATE chatrooms SET name = ?, description = ? WHERE name = ?',
            [name, description, req.params.name]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Chatroom not found' });
        }
        
        res.json({ success: true, message: 'Chatroom updated successfully' });
    } catch (error) {
        console.error('Error updating chatroom:', error);
        res.status(500).json({ error: 'Failed to update chatroom' });
    }
});

// Delete chatroom
app.delete('/api/chatrooms/:name', async (req, res) => {
    try {
        const [result] = await pool.execute(
            'DELETE FROM chatrooms WHERE name = ?',
            [req.params.name]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Chatroom not found' });
        }
        
        res.json({ success: true, message: 'Chatroom deleted successfully' });
    } catch (error) {
        console.error('Error deleting chatroom:', error);
        res.status(500).json({ error: 'Failed to delete chatroom' });
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log('Login attempt for user:', username);

        // Find user in database
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            console.log('User not found:', username);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];

        // Verify password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            console.log('Invalid password for user:', username);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Log successful login
        await pool.execute(
            'INSERT INTO activity_logs (user_id, action, details, timestamp) VALUES (?, ?, ?, ?)',
            [user.id, 'LOGIN', `User logged in: ${username}`, new Date()]
        );

        // Send user data (excluding password)
        const userData = {
            id: user.id,
            username: user.username,
            email: user.email,
            preferred_language: user.preferred_language,
            user_type: user.user_type
        };

        console.log('Login successful for user:', username);
        res.json({ success: true, user: userData });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

server.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});
