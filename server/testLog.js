import User from './models/User.js';
import ActivityLog from './models/ActivityLog.js';

const runTest = async () => {
  try {
    // Check if user with ID 7 exists
    const user = await User.findById(7);
    
    // If user doesn't exist, create one for testing
    if (!user) {
      console.log('User with ID 7 does not exist. Creating user...');
      const newUserId = await User.create({
        username: 'test_user',
        email: 'test_user@example.com',
        password: 'testpassword123',
      });
      console.log('Created new user with ID:', newUserId);
    }

    // Log activity for user ID 7
    const inserted = await ActivityLog.log(7, 'Test log entry from testLog.js');
    console.log('✅ Activity log inserted with ID:', inserted);
  } catch (err) {
    console.error('❌ Logging failed:', err);
  }
};

runTest();
