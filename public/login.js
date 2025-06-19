// Check if user is already logged in
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (currentUser) {
    if (currentUser.user_type === 'Admin') {
        window.location.href = '/admin.html';
    } else {
        window.location.href = '/app.html';
    }
}

// Prevent going back to register page after login
window.addEventListener('popstate', (event) => {
    if (currentUser) {
        event.preventDefault();
        if (currentUser.user_type === 'Admin') {
            window.location.href = '/admin.html';
        } else {
            window.location.href = '/app.html';
        }
    }
});

// Handle login
const loginForm = document.getElementById('login-form');
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        // Store user data
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        
        // Redirect based on user type
        if (data.user.user_type === 'Admin') {
            window.location.href = '/admin.html';
        } else {
            window.location.href = '/app.html';
        }
    } catch (error) {
        console.error('Login error:', error);
        alert(error.message || 'Invalid credentials');
    }
}); 