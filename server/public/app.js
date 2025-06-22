const socket = io();

// Page elements
const registerPage = document.getElementById('register-page');
const loginPage = document.getElementById('login-page');
const roomSelection = document.getElementById('room-selection');
const chatContainer = document.querySelector('.chat-container');

// Form elements
const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const msgInput = document.querySelector('#message');
const nameInput = document.querySelector('#name');
const chatRoom = document.querySelector('#room');
const activity = document.querySelector('.activity');
const usersList = document.querySelector('.user-list');
const roomList = document.querySelector('.room-list');
const chatDisplay = document.querySelector('.chat-display');
const currentUserName = document.querySelector('#current-user-name');
const logoutBtn = document.querySelector('#logout');
const searchInput = document.querySelector('.search-input');

// Navigation elements
const goToLoginLink = document.getElementById('go-to-login');
const goToRegisterLink = document.getElementById('go-to-register');

// Store user data
let currentUser = null;
let joinedRooms = [];
let currentRoom = null;

// Page navigation
goToLoginLink.addEventListener('click', (e) => {
  e.preventDefault();
  registerPage.style.display = 'none';
  loginPage.style.display = 'flex';
});

goToRegisterLink.addEventListener('click', (e) => {
  e.preventDefault();
  loginPage.style.display = 'none';
  registerPage.style.display = 'flex';
});

// Handle registration
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('reg-username').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const language = document.getElementById('reg-language').value;
  const accountType = document.getElementById('reg-account-type').value;

  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        email,
        password,
        language,
        accountType
      })
    });

    const data = await response.json();
    if (data.success) {
      // Store user data in localStorage for session management
      const userData = {
        username,
        email,
        password,
        language,
        accountType
      };
      localStorage.setItem(username, JSON.stringify(userData));

      // Log activity
      logActivity(username, 'Registered new account');

      // Show login page
      registerPage.style.display = 'none';
      loginPage.style.display = 'flex';
    } else {
      alert('Registration failed: ' + data.error);
    }
  } catch (error) {
    console.error('Registration error:', error);
    alert('Registration failed. Please try again.');
  }
});

// Handle login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (data.success) {
      // Store user data in localStorage for session management
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      logActivity(username, 'Logged in');

      // Redirect admin to admin dashboard
      if (data.user.user_type === 'Admin') {
        window.location.href = '/admin.html';
        return;
      }

      // Show room selection for regular users
      loginPage.style.display = 'none';
      roomSelection.style.display = 'flex';
      nameInput.value = username;
      updateRoomSelection();
    } else {
      alert('Invalid credentials');
    }
  } catch (error) {
    alert('Login failed. Please try again.');
  }
});

function sendMessage(e) {
  e.preventDefault();
  if (nameInput.value && msgInput.value && chatRoom.value) {
    socket.emit('message', {
      name: nameInput.value,
      text: msgInput.value,
    });
    logActivity(nameInput.value, `Sent message in ${chatRoom.value}`);
    msgInput.value = '';
  }
  msgInput.focus();
}

function enterRoom(e) {
  e.preventDefault();
  if (nameInput.value && chatRoom.value) {
    // Add to joined rooms if not already present
    if (!joinedRooms.includes(chatRoom.value)) {
      joinedRooms.push(chatRoom.value);
      updateJoinedRoomList();
    }
    // Set current room
    currentRoom = chatRoom.value;
    // Show chat interface and hide room selection
    roomSelection.style.display = 'none';
    chatContainer.style.display = 'grid';
    // Set current user name in the header
    currentUserName.textContent = nameInput.value;
    // Set current room name
    document.querySelector('.current-room-name').textContent = currentRoom;
    // Clear chat area for new room
    chatDisplay.innerHTML = '';
    socket.emit('enterRoom', {
      name: nameInput.value,
      room: chatRoom.value,
    });
    logActivity(nameInput.value, `Joined room: ${chatRoom.value}`);
}
}

function updateJoinedRoomList() {
  const list = document.querySelector('.joined-room-list');
  list.innerHTML = '';
  joinedRooms.forEach(room => {
    const li = document.createElement('li');
    li.textContent = room;
    li.className = room === currentRoom ? 'active' : '';
    li.onclick = () => {
      chatRoom.value = room;
      enterRoom({ preventDefault: () => {} });
    };
    list.appendChild(li);
  });
}

function logout() {
  // Hide chat interface and show login
  chatContainer.style.display = 'none';
  loginPage.style.display = 'flex';
  
  // Clear chat display
  chatDisplay.innerHTML = '';
  
  // Emit leave room event
  if (chatRoom.value) {
    socket.emit('leaveRoom', {
      name: nameInput.value,
      room: chatRoom.value
    });
    logActivity(nameInput.value, `Left room: ${chatRoom.value}`);
  }
  
  // Clear input fields and current user
  nameInput.value = '';
  chatRoom.value = '';
  msgInput.value = '';
  localStorage.removeItem('currentUser');
  currentUser = null;
}

function logActivity(user, activity) {
  const activityLog = JSON.parse(localStorage.getItem('activityLog')) || [];
  const logEntry = {
    time: new Date().toISOString(),
    user,
    activity
  };
  activityLog.push(logEntry);
  localStorage.setItem('activityLog', JSON.stringify(activityLog));
}

function filterMessages(searchTerm) {
  const messages = chatDisplay.querySelectorAll('.post');
  messages.forEach(message => {
    const text = message.querySelector('.post__text').textContent.toLowerCase();
    if (text.includes(searchTerm.toLowerCase())) {
      message.style.display = 'block';
    } else {
      message.style.display = 'none';
    }
  });
}

// Event Listeners
document.querySelector('.form-msg').addEventListener('submit', sendMessage);
document.querySelector('.form-join').addEventListener('submit', enterRoom);
logoutBtn.addEventListener('click', logout);

msgInput.addEventListener('keypress', () => {
  socket.emit('activity', nameInput.value);
});

searchInput.addEventListener('input', (e) => {
  filterMessages(e.target.value);
});

// Socket event listeners
socket.on('message', (data) => {
  activity.textContent = '';
  const { name, text, time } = data;
  const li = document.createElement('li');
  li.className = 'post';
  if (name === nameInput.value) li.className = 'post post--right';
  if (name !== nameInput.value && name !== 'Admin')
    li.className = 'post post--left';
  if (name !== 'Admin') {
    li.innerHTML = `<div class="post__header">
        <span class="post__header--name">${name}</span> 
        <span class="post__header--time">${time}</span> 
        </div>
        <div class="post__text">${text}</div>`;
  } else {
    li.innerHTML = `<div class="post__text">${text}</div>`;
  }
  chatDisplay.appendChild(li);
  // Log chat message
  if (name !== 'Admin') {
    logActivity(name, `Sent message in ${currentRoom}`);
  }
  // Scroll to bottom of chat
  const chatArea = document.querySelector('.chat-area');
  chatArea.scrollTop = chatArea.scrollHeight;
});

let activityTimer;
socket.on('activity', (name) => {
  activity.textContent = `${name} is typing...`;

  // Clear after 3 seconds
  clearTimeout(activityTimer);
  activityTimer = setTimeout(() => {
    activity.textContent = '';
  }, 3000);
});

socket.on('userList', ({ users }) => {
  showUsers(users);
});

socket.on('roomList', ({ rooms }) => {
  showRooms(rooms);
});

function showUsers(users) {
  const userList = document.querySelector('.group-info .user-list');
  if (!userList) return;
  userList.innerHTML = '';
  if (users) {
    users.forEach((user) => {
      userList.innerHTML += `
        <li class="user-item">
          <span class="user-name">${user.name}</span>
        </li>`;
    });
  }
}

function showRooms(rooms) {
  roomList.innerHTML = '<h3>Active Rooms</h3>';
  if (rooms) {
    rooms.forEach((room) => {
      roomList.innerHTML += `
        <div class="room-item">
          <span class="room-name">${room}</span>
        </div>`;
    });
  }
}

// Check if user is already logged in
const savedUser = JSON.parse(localStorage.getItem('currentUser'));
if (savedUser) {
  currentUser = savedUser;
  if (savedUser.user_type === 'Admin') {
    window.location.href = '/admin.html';
  } else {
    loginPage.style.display = 'none';
    roomSelection.style.display = 'flex';
    nameInput.value = savedUser.username;
    updateRoomSelection();
  }
}

// Add this function to update room options
async function updateRoomSelection() {
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

        const roomSelect = document.querySelector('#room');
        if (roomSelect) {
            const currentValue = roomSelect.value;
            roomSelect.innerHTML = '<option value="" disabled selected>Select Room</option>';
            chatrooms.forEach(room => {
                roomSelect.innerHTML += `<option value="${room.name}">${room.name}</option>`;
            });
            if (currentValue) roomSelect.value = currentValue;
        }
    } catch (error) {
        alert('Failed to fetch chatrooms. Please try again.');
  }
}
