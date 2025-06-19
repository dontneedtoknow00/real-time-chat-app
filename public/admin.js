// Check if user is admin
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser || currentUser.user_type !== 'Admin') {
    window.location.href = '/index.html';
}

// DOM Elements
const userModal = document.getElementById('user-modal');
const chatroomModal = document.getElementById('chatroom-modal');
const userForm = document.getElementById('user-form');
const chatroomForm = document.getElementById('chatroom-form');
const addUserBtn = document.getElementById('add-user-btn');
const addChatroomBtn = document.getElementById('add-chatroom-btn');
const activityDate = document.getElementById('activity-date');
const activityType = document.getElementById('activity-type');
const adminLogout = document.getElementById('admin-logout');

// Close buttons for modals
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
        userModal.style.display = 'none';
        chatroomModal.style.display = 'none';
    });
});

// User Management
let editingUserId = null;

async function displayUsers() {
    try {
        const response = await fetch('/api/users', {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        if (!response.ok) throw new Error('Failed to fetch users');
        const users = await response.json();

        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = '';
        if (users.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="5" style="text-align: center;">No users found</td>';
            tbody.appendChild(tr);
            return;
        }
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.user_type}</td>
                <td>${user.preferred_language}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="editUser('${user.username}')">Edit</button>
                    <button class="action-btn delete-btn" onclick="deleteUser('${user.username}')">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        alert('Failed to fetch users. Please try again.');
    }
}

async function addUser(userData) {
    try {
        console.log('Sending user creation request:', userData);
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        console.log('Response status:', response.status);
        const responseData = await response.json();
        console.log('Response data:', responseData);
        
        if (!response.ok) {
            throw new Error(responseData.error || 'Failed to create user');
        }

        await displayUsers();
        logActivity(currentUser.username, `Added new user: ${userData.username}`);
        alert('User created successfully!');
    } catch (error) {
        console.error('Error adding user:', error);
        alert(error.message || 'Failed to create user. Please try again.');
    }
}

async function editUser(username) {
    try {
        const response = await fetch(`/api/users/${username}`);
        if (!response.ok) throw new Error('Failed to fetch user data');
        const userData = await response.json();
        
        document.getElementById('username').value = userData.username;
        document.getElementById('email').value = userData.email;
        document.getElementById('user-language').value = userData.preferred_language;
        document.getElementById('user-type').value = userData.user_type;
        document.getElementById('password').value = ''; // Don't show password
        editingUserId = username;
        document.getElementById('user-modal-title').textContent = 'Edit User';
        userModal.style.display = 'block';
    } catch (error) {
        console.error('Error fetching user data:', error);
        alert('Failed to fetch user data. Please try again.');
    }
}

async function deleteUser(username) {
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            const response = await fetch(`/api/users/${username}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete user');
            }
            
            await displayUsers();
            logActivity(currentUser.username, `Deleted user: ${username}`);
            alert('User deleted successfully!');
        } catch (error) {
            console.error('Error deleting user:', error);
            alert(error.message || 'Failed to delete user. Please try again.');
        }
    }
}

// Chatroom Management
let editingChatroomId = null;

async function displayChatrooms() {
    try {
        const response = await fetch('/api/chatrooms', {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        if (!response.ok) throw new Error('Failed to fetch chatrooms');
        const chatrooms = await response.json();

        const tbody = document.getElementById('chatrooms-table-body');
        tbody.innerHTML = '';
        if (chatrooms.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="4" style="text-align: center;">No chatrooms found</td>';
            tbody.appendChild(tr);
            return;
        }
        chatrooms.forEach(room => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${room.name}</td>
                <td>${room.description || ''}</td>
                <td>${new Date(room.created_at).toLocaleString()}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="editChatroom('${room.name}')">Edit</button>
                    <button class="action-btn delete-btn" onclick="deleteChatroom('${room.name}')">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        alert('Failed to fetch chatrooms. Please try again.');
    }
}

async function addChatroom(chatroomData) {
    try {
        console.log('Sending chatroom creation request:', chatroomData);
        const response = await fetch('/api/chatrooms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(chatroomData)
        });
        
        console.log('Response status:', response.status);
        const responseData = await response.json();
        console.log('Response data:', responseData);
        
        if (!response.ok) {
            throw new Error(responseData.error || 'Failed to create chatroom');
        }
        
        await displayChatrooms();
        logActivity(currentUser.username, `Created new chatroom: ${chatroomData.name}`);
        alert('Chatroom created successfully!');
    } catch (error) {
        console.error('Error adding chatroom:', error);
        alert(error.message || 'Failed to create chatroom. Please try again.');
    }
}

async function editChatroom(name) {
    try {
        const response = await fetch(`/api/chatrooms/${name}`);
        if (!response.ok) throw new Error('Failed to fetch chatroom data');
        const chatroomData = await response.json();
        
        document.getElementById('chatroom-name').value = chatroomData.name;
        document.getElementById('chatroom-description').value = chatroomData.description;
        editingChatroomId = name;
        document.getElementById('chatroom-modal-title').textContent = 'Edit Chatroom';
        chatroomModal.style.display = 'block';
    } catch (error) {
        console.error('Error fetching chatroom data:', error);
        alert('Failed to fetch chatroom data. Please try again.');
    }
}

async function deleteChatroom(name) {
    if (confirm('Are you sure you want to delete this chatroom?')) {
        try {
            const response = await fetch(`/api/chatrooms/${name}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete chatroom');
            }
            
            await displayChatrooms();
            logActivity(currentUser.username, `Deleted chatroom: ${name}`);
            alert('Chatroom deleted successfully!');
        } catch (error) {
            console.error('Error deleting chatroom:', error);
            alert(error.message || 'Failed to delete chatroom. Please try again.');
        }
    }
}

// Event Listeners
addUserBtn.addEventListener('click', () => {
    editingUserId = null;
    userForm.reset();
    document.getElementById('user-modal-title').textContent = 'Add New User';
    userModal.style.display = 'block';
});

addChatroomBtn.addEventListener('click', () => {
    editingChatroomId = null;
    chatroomForm.reset();
    document.getElementById('chatroom-modal-title').textContent = 'Create New Chatroom';
    chatroomModal.style.display = 'block';
});

userForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userData = {
        username: document.getElementById('username').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        language: document.getElementById('user-language').value,
        accountType: document.getElementById('user-type').value
    };
    
    try {
        if (editingUserId) {
            // Update existing user
            const response = await fetch(`/api/users/${editingUserId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: userData.username,
                    email: userData.email,
                    password: userData.password,
                    preferred_language: userData.language,
                    user_type: userData.accountType
                })
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Failed to update user');
            }
            logActivity(currentUser.username, `Updated user: ${editingUserId} to ${userData.username}`);
        } else {
            // Create new user using /api/register
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Failed to create user');
            }
            logActivity(currentUser.username, `Added new user: ${userData.username}`);
        }
        // Close modal and refresh user list
        editingUserId = null;
        userModal.style.display = 'none';
        await displayUsers();
        alert(editingUserId ? 'User updated successfully!' : 'User created successfully!');
    } catch (error) {
        alert(error.message || 'Operation failed. Please try again.');
    }
});

chatroomForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const chatroomData = {
        name: document.getElementById('chatroom-name').value,
        description: document.getElementById('chatroom-description').value
    };
    
    try {
        if (editingChatroomId) {
            // Update existing chatroom
            const response = await fetch(`/api/chatrooms/${editingChatroomId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(chatroomData)
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Failed to update chatroom');
            }
            logActivity(currentUser.username, `Updated chatroom: ${editingChatroomId} to ${chatroomData.name}`);
        } else {
            // Create new chatroom using /api/chatrooms
            const response = await fetch('/api/chatrooms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(chatroomData)
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Failed to create chatroom');
            }
            logActivity(currentUser.username, `Created new chatroom: ${chatroomData.name}`);
        }
        // Close modal and refresh chatroom list
        editingChatroomId = null;
        chatroomModal.style.display = 'none';
        await displayChatrooms();
        alert(editingChatroomId ? 'Chatroom updated successfully!' : 'Chatroom created successfully!');
    } catch (error) {
        alert(error.message || 'Operation failed. Please try again.');
    }
});

// Activity Logs
async function displayActivityLogs() {
    try {
        const response = await fetch('/api/activity-logs');
        if (!response.ok) throw new Error('Failed to fetch activity logs');
        const logs = await response.json();
        
        const tbody = document.getElementById('activity-table-body');
        tbody.innerHTML = '';
        
        logs.forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${log.username}</td>
                <td>${log.action}</td>
                <td>${log.details}</td>
                <td>${new Date(log.timestamp).toLocaleString()}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error fetching activity logs:', error);
        alert('Failed to fetch activity logs. Please try again.');
    }
}

async function logActivity(username, action) {
    try {
        const response = await fetch('/api/activity-logs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                action,
                details: `${action} by ${username}`,
                timestamp: new Date()
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to log activity');
        }
        
        await displayActivityLogs();
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// Filter activity logs
activityDate.addEventListener('change', displayActivityLogs);
activityType.addEventListener('change', displayActivityLogs);

// Logout
adminLogout.addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    window.location.href = '/index.html';
});

// Initialize displays with force refresh
async function initializeDisplays() {
    console.log('=== INITIALIZING ADMIN PAGE ===');
    try {
        await displayUsers();
        await displayChatrooms();
        await displayActivityLogs();
    } catch (error) {
        console.error('Error initializing displays:', error);
        alert('Error loading data. Please refresh the page.');
    }
}

// Call initializeDisplays when page loads
document.addEventListener('DOMContentLoaded', initializeDisplays); 