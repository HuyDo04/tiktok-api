'use strict';

const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const users = [];

    for (let i = 0; i < 50; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();

      const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${faker.number.int({ min: 1, max: 999 })}`;
      const email = faker.internet.email({ firstName, lastName });
      const password = await bcrypt.hash('password123', 10);

      users.push({
        username,
        email,
        password,
        avatar: faker.datatype.boolean() ? faker.image.avatar() : null,
        verified_at: faker.datatype.boolean() ? faker.date.past({ years: 1 }) : null,
        verify_token: faker.datatype.boolean() ? faker.string.alphanumeric(32) : null,
        verify_token_expires_at: faker.datatype.boolean() ? faker.date.soon({ days: 7 }) : null,
        reset_password_otp: null, // Có thể random nếu muốn
        reset_password_otp_expires_at: null,
        createdAt: faker.date.between({ from: '2023-01-01', to: new Date() }),
        updatedAt: new Date(),
      });
    }

    await queryInterface.bulkInsert('users', users);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', null, {});
  },
};
