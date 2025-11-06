"use strict";

const { faker } = require("@faker-js/faker");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Lấy danh sách user và post có sẵn
    const users = await queryInterface.sequelize.query(
      `SELECT id FROM users;`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const posts = await queryInterface.sequelize.query(
      `SELECT id FROM posts;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!users.length || !posts.length) {
      console.log("Không có user hoặc post để tạo comment");
      return;
    }

    // ===== 1. Tạo comment cha =====
    const parentComments = Array.from({ length: 10 }).map(() => ({
      content: faker.lorem.sentences(2),
      authorId: users[Math.floor(Math.random() * users.length)].id,
      postId: posts[Math.floor(Math.random() * posts.length)].id,
      parentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await queryInterface.bulkInsert("comments", parentComments);

    // ===== 2. Lấy id comment cha vừa tạo =====
    const parentIds = await queryInterface.sequelize.query(
      `SELECT id FROM comments WHERE parentId IS NULL ORDER BY id DESC LIMIT 10;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const parentIdList = parentIds.map(c => c.id);

    // ===== 3. Tạo comment con =====
    const childComments = [];
    parentIdList.forEach(parentId => {
      const repliesCount = faker.number.int({ min: 1, max: 3 }); // mỗi comment cha có 1-3 reply
      for (let i = 0; i < repliesCount; i++) {
        childComments.push({
          content: faker.lorem.sentences(1),
          authorId: users[Math.floor(Math.random() * users.length)].id,
          postId: posts[Math.floor(Math.random() * posts.length)].id,
          parentId: parentId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    });

    await queryInterface.bulkInsert("comments", childComments);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("comments", null, {});
  },
};
