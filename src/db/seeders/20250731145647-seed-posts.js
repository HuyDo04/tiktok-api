'use strict';

const { faker } = require('@faker-js/faker');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Lấy danh sách user id
    const users = await queryInterface.sequelize.query(
      `SELECT id FROM users;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const userIds = users.map(u => u.id); // ✅ chuyển thành mảng số

    // Lấy danh sách topic id
    const topics = await queryInterface.sequelize.query(
      `SELECT id, name FROM topics WHERE id BETWEEN 1 AND 24;`, // lấy 24 topic
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!userIds.length || !topics.length) {
      throw new Error("Cần có dữ liệu trong bảng users và topics trước khi seed posts.");
    }

    const posts = [];

    // Lặp qua từng topic và tạo ít nhất 5 bài viết
    topics.forEach((topic) => {
      const postCount = faker.number.int({ min: 5, max: 8 }); // Ít nhất 5, nhiều nhất 8
      for (let i = 1; i <= postCount; i++) {
        const title = `${topic.name} Guide ${i}: ${faker.word.adjective()} ${faker.word.noun()}`;
        const slug = faker.helpers.slugify(title).toLowerCase();
        const content = generateContent();

        posts.push({
          title,
          excerpt: `${topic.name} - ${faker.lorem.sentence(12)}`,
          slug,
          featuredImage: `https://placehold.co/400x200?text=${encodeURIComponent(topic.name + ' ' + i)}`,
          content,
          publishedAt: faker.date.between({ from: '2023-01-01', to: new Date() }),
          readTime: faker.number.int({ min: 3, max: 10 }),
          topicId: topic.id,
          authorId: faker.helpers.arrayElement(userIds), // ✅ random đúng ID tồn tại
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    });

    await queryInterface.bulkInsert('posts', posts);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('posts', null, {});
  },
};

// Hàm tạo nội dung HTML giả lập
function generateContent() {
  const paragraphs = faker.number.int({ min: 4, max: 8 });
  let content = '';
  for (let i = 0; i < paragraphs; i++) {
    content += `<p>${faker.lorem.paragraph()}</p>\n`;
  }
  return content;
}
