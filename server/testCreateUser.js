// testCreateUser.js
import User from './models/User.js'; // adjust path if needed

(async () => {
    try {
        const newUserId = await User.create({
            username: 'john_doe',
            email: 'john@example.com',
            password: 'mypassword123'
        });
        console.log('✅ User created with ID:', newUserId);
    } catch (err) {
        console.error('❌ Failed to create user:', err.message);
    }
})();
