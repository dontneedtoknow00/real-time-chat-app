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

// User and Chatroom Management (Database-driven)
let users = [];
let chatrooms = [];
let editingUserId = null;
let editingChatroomName = null;

// Fetch all users from backend
async function fetchUsers() {
    try {
        const res = await fetch('/api/users');
        users = await res.json();
        displayUsers();
    } catch (err) {
        alert('Failed to fetch users');
    }
}

// Fetch all chatrooms from backend
async function fetchChatrooms() {
    try {
        const res = await fetch('/api/chatrooms');
        chatrooms = await res.json();
        displayChatrooms();
        updateChatroomOptions();
    } catch (err) {
        alert('Failed to fetch chatrooms');
    }
}

function displayUsers() {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';
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
}

function displayChatrooms() {
    const tbody = document.getElementById('chatrooms-table-body');
    tbody.innerHTML = '';
    chatrooms.forEach(room => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${room.name}</td>
            <td>${room.description || ''}</td>
            <td></td>
            <td>
                <button class="action-btn edit-btn" onclick="editChatroom('${room.name}')">Edit</button>
                <button class="action-btn delete-btn" onclick="deleteChatroom('${room.name}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.editUser = function(username) {
    const user = users.find(u => u.username === username);
    if (user) {
        document.getElementById('username').value = user.username;
        document.getElementById('email').value = user.email;
        document.getElementById('user-language').value = user.preferred_language;
        document.getElementById('user-type').value = user.user_type;
        document.getElementById('password').value = '';
        editingUserId = user.username;
        document.getElementById('user-modal-title').textContent = 'Edit User';
        userModal.style.display = 'block';
    }
}

window.deleteUser = async function(username) {
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            const res = await fetch(`/api/users/${username}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                alert('User deleted successfully!');
                fetchUsers();
            } else {
                alert('Failed to delete user: ' + data.error);
            }
        } catch (err) {
            alert('Error deleting user: ' + err.message);
        }
    }
}

window.editChatroom = function(name) {
    const room = chatrooms.find(r => r.name === name);
    if (room) {
        document.getElementById('chatroom-name').value = room.name;
        document.getElementById('chatroom-description').value = room.description || '';
        editingChatroomName = room.name;
        document.getElementById('chatroom-modal-title').textContent = 'Edit Chatroom';
        chatroomModal.style.display = 'block';
    }
}

window.deleteChatroom = async function(name) {
    if (confirm('Are you sure you want to delete this chatroom?')) {
        try {
            const res = await fetch(`/api/chatrooms/${name}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                alert('Chatroom deleted successfully!');
                fetchChatrooms();
            } else {
                alert('Failed to delete chatroom: ' + data.error);
            }
        } catch (err) {
            alert('Error deleting chatroom: ' + err.message);
        }
    }
}

userForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userData = {
        username: document.getElementById('username').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        preferred_language: document.getElementById('user-language').value,
        user_type: document.getElementById('user-type').value
    };
    try {
        let response, data;
        if (editingUserId) {
            // Edit user
            response = await fetch(`/api/users/${editingUserId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            data = await response.json();
            if (data.success) {
                alert('User updated successfully!');
                userModal.style.display = 'none';
                editingUserId = null;
                fetchUsers();
            } else {
                alert('Failed to update user: ' + data.error);
            }
        } else {
            // Add user
            response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            data = await response.json();
            if (data.success) {
                alert('User added successfully!');
                userModal.style.display = 'none';
                fetchUsers();
            } else {
                alert('Failed to add user: ' + data.error);
            }
        }
    } catch (error) {
        alert('Error saving user: ' + error.message);
    }
});

chatroomForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const chatroomData = {
        name: document.getElementById('chatroom-name').value,
        description: document.getElementById('chatroom-description').value
    };
    try {
        let response, data;
        if (editingChatroomName) {
            // Edit chatroom
            response = await fetch(`/api/chatrooms/${editingChatroomName}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(chatroomData)
            });
            data = await response.json();
            if (data.success) {
                alert('Chatroom updated successfully!');
                chatroomModal.style.display = 'none';
                editingChatroomName = null;
                fetchChatrooms();
            } else {
                alert('Failed to update chatroom: ' + data.error);
            }
        } else {
            // Add chatroom
            response = await fetch('/api/chatrooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(chatroomData)
            });
            data = await response.json();
            if (data.success) {
                alert('Chatroom created successfully!');
                chatroomModal.style.display = 'none';
                fetchChatrooms();
            } else {
                alert('Failed to create chatroom: ' + data.error);
            }
        }
    } catch (error) {
        alert('Error saving chatroom: ' + error.message);
    }
});

function updateChatroomOptions() {
    // Update chatroom options in the main chat interface (if needed)
}

// Activity Logging
let activityLog = JSON.parse(localStorage.getItem('activityLog')) || [];

function logActivity(user, activity) {
    const logEntry = {
        time: new Date().toISOString(),
        user,
        activity
    };
    activityLog.push(logEntry);
    localStorage.setItem('activityLog', JSON.stringify(activityLog));
    displayActivityLog();
}

function displayActivityLog() {
    const tbody = document.getElementById('activity-table-body');
    tbody.innerHTML = '';
    
    let filteredLog = activityLog;
    
    // Apply date filter
    if (activityDate.value) {
        const selectedDate = new Date(activityDate.value).toDateString();
        filteredLog = filteredLog.filter(entry => 
            new Date(entry.time).toDateString() === selectedDate
        );
    }
    
    // Apply activity type filter
    if (activityType.value !== 'all') {
        filteredLog = filteredLog.filter(entry => 
            entry.activity.toLowerCase().includes(activityType.value)
        );
    }
    
    filteredLog.forEach(entry => {
        const tr = document.createElement('tr');
        const date = new Date(entry.time);
        tr.innerHTML = `
            <td>${date.toLocaleTimeString()}</td>
            <td>${entry.user}</td>
            <td>${entry.activity}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Event Listeners
addUserBtn.addEventListener('click', () => {
    editingUserId = null;
    userForm.reset();
    document.getElementById('user-modal-title').textContent = 'Add New User';
    userModal.style.display = 'block';
});

addChatroomBtn.addEventListener('click', () => {
    editingChatroomName = null;
    chatroomForm.reset();
    document.getElementById('chatroom-modal-title').textContent = 'Create New Chatroom';
    chatroomModal.style.display = 'block';
});

activityDate.addEventListener('change', displayActivityLog);
activityType.addEventListener('change', displayActivityLog);

adminLogout.addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    window.location.href = '/index.html';
});

// Initial fetch
fetchUsers();
fetchChatrooms();
displayActivityLog();

// Update chatroom options in main chat
updateChatroomOptions(); 