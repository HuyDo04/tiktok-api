require('module-alias/register');
// createTestUsers.js
const bcrypt = require('bcrypt');
const db = require('./src/models');

const createTestUsers = async () => {
  try {
    const usersData = [
      {
        username: 'testuser1',
        email: 'test1@example.com',
        password: 'password123',
      },
      {
        username: 'testuser2',
        email: 'test2@example.com',
        password: 'password123',
      },
      {
        username: 'testuser3',
        email: 'test3@example.com',
        password: 'password123',
      },
      {
        username: 'testuser4',
        email: 'test4@example.com',
        password: 'password123',
      },
    ];

    for (const userData of usersData) {
      const existingUser = await db.User.findOne({ where: { email: userData.email } });
      if (existingUser) {
        console.log(`User with email ${userData.email} already exists. Skipping.`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);
      await db.User.create({
        ...userData,
        password: hashedPassword,
        verified_at: new Date(),
      });
      console.log(`User ${userData.username} created successfully.`);
    }
  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    await db.sequelize.close();
  }
};

createTestUsers();
