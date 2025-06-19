// Check if user is admin
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser || currentUser.accountType !== 'Admin') {
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
let users = JSON.parse(localStorage.getItem('users')) || [];
let editingUserId = null;

function displayUsers() {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';
    
    const allUsers = getAllUsers();
    allUsers.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${user.accountType}</td>
            <td>${user.language}</td>
            <td>
                <button class="action-btn edit-btn" onclick="editUser('${user.username}')">Edit</button>
                <button class="action-btn delete-btn" onclick="deleteUser('${user.username}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function getAllUsers() {
    const users = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        try {
            const value = JSON.parse(localStorage.getItem(key));
            if (value && value.username && value.email) {
                users.push(value);
            }
        } catch (e) {
            continue;
        }
    }
    return users;
}

function addUser(userData) {
    localStorage.setItem(userData.username, JSON.stringify(userData));
    logActivity(currentUser.username, `Added new user: ${userData.username}`);
    displayUsers();
}

function editUser(username) {
    const userData = JSON.parse(localStorage.getItem(username));
    if (userData) {
        document.getElementById('username').value = userData.username;
        document.getElementById('email').value = userData.email;
        document.getElementById('user-language').value = userData.language;
        document.getElementById('user-type').value = userData.accountType;
        document.getElementById('password').value = userData.password;
        editingUserId = username;
        document.getElementById('user-modal-title').textContent = 'Edit User';
        userModal.style.display = 'block';
    }
}

function deleteUser(username) {
    if (confirm('Are you sure you want to delete this user?')) {
        localStorage.removeItem(username);
        logActivity(currentUser.username, `Deleted user: ${username}`);
        displayUsers();
    }
}

// Chatroom Management
let chatrooms = JSON.parse(localStorage.getItem('chatrooms')) || [
    { name: 'Red', description: 'Red Room', users: [] },
    { name: 'Green', description: 'Green Room', users: [] },
    { name: 'Blue', description: 'Blue Room', users: [] }
];
let editingChatroomId = null;

function displayChatrooms() {
    const tbody = document.getElementById('chatrooms-table-body');
    tbody.innerHTML = '';
    
    chatrooms.forEach(room => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${room.name}</td>
            <td>${room.description}</td>
            <td>${room.users.length}</td>
            <td>
                <button class="action-btn edit-btn" onclick="editChatroom('${room.name}')">Edit</button>
                <button class="action-btn delete-btn" onclick="deleteChatroom('${room.name}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function addChatroom(chatroomData) {
    chatrooms.push(chatroomData);
    localStorage.setItem('chatrooms', JSON.stringify(chatrooms));
    logActivity(currentUser.username, `Created new chatroom: ${chatroomData.name}`);
    displayChatrooms();
    updateChatroomOptions();
}

function editChatroom(name) {
    const room = chatrooms.find(r => r.name === name);
    if (room) {
        document.getElementById('chatroom-name').value = room.name;
        document.getElementById('chatroom-description').value = room.description;
        editingChatroomId = name;
        document.getElementById('chatroom-modal-title').textContent = 'Edit Chatroom';
        chatroomModal.style.display = 'block';
    }
}

function deleteChatroom(name) {
    if (confirm('Are you sure you want to delete this chatroom?')) {
        chatrooms = chatrooms.filter(room => room.name !== name);
        localStorage.setItem('chatrooms', JSON.stringify(chatrooms));
        logActivity(currentUser.username, `Deleted chatroom: ${name}`);
        displayChatrooms();
        updateChatroomOptions();
    }
}

function updateChatroomOptions() {
    // Update chatroom options in the main chat interface
    const roomSelect = document.querySelector('#room');
    if (roomSelect) {
        const currentValue = roomSelect.value;
        roomSelect.innerHTML = '<option value="" disabled selected>Select Room</option>';
        chatrooms.forEach(room => {
            roomSelect.innerHTML += `<option value="${room.name}">${room.name}</option>`;
        });
        if (currentValue) roomSelect.value = currentValue;
    }
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
    editingChatroomId = null;
    chatroomForm.reset();
    document.getElementById('chatroom-modal-title').textContent = 'Create New Chatroom';
    chatroomModal.style.display = 'block';
});

userForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const userData = {
        username: document.getElementById('username').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        language: document.getElementById('user-language').value,
        accountType: document.getElementById('user-type').value
    };
    
    if (editingUserId) {
        // Remove old user data
        localStorage.removeItem(editingUserId);
        
        // If this is the current logged-in user, update their session
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser && currentUser.username === editingUserId) {
            currentUser.username = userData.username;
            currentUser.email = userData.email;
            currentUser.password = userData.password;
            currentUser.language = userData.language;
            currentUser.accountType = userData.accountType;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        
        logActivity(currentUser.username, `Updated user: ${editingUserId} to ${userData.username}`);
    }
    
    // Store new user data under new username
    localStorage.setItem(userData.username, JSON.stringify(userData));
    
    // Clear editing state and close modal
    editingUserId = null;
    userModal.style.display = 'none';
    displayUsers();
});

chatroomForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const chatroomData = {
        name: document.getElementById('chatroom-name').value,
        description: document.getElementById('chatroom-description').value,
        users: []
    };
    
    if (editingChatroomId) {
        chatrooms = chatrooms.filter(room => room.name !== editingChatroomId);
        logActivity(currentUser.username, `Updated chatroom: ${chatroomData.name}`);
    }
    
    addChatroom(chatroomData);
    chatroomModal.style.display = 'none';
});

activityDate.addEventListener('change', displayActivityLog);
activityType.addEventListener('change', displayActivityLog);

adminLogout.addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    window.location.href = '/index.html';
});

// Initialize displays
displayUsers();
displayChatrooms();
displayActivityLog();

// Update chatroom options in main chat
updateChatroomOptions(); 