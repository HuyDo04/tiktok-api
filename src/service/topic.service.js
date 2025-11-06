const { Topic, Post } = require("@/models");

exports.getAllTopicsWithPosts = async () => {
  return await Topic.findAll({
    include: [
      {
        model: Post,
        as: "posts",
      }
    ]
  });
};

exports.getTopicById = async (id) => {
  return await Topic.findByPk(id, {
    include: [
      {
        model: Post,
        as: "posts",
      }
    ]
  });
};

exports.getTopicBySlug = async (slug) => {
  return await Topic.findOne({
    where: { slug },
    include: [
      {
        model: Post,
        as: "posts",
      }
    ]
  });
};

exports.createTopic = async (topicData) => {
  return await Topic.create(topicData);
};

exports.updateTopic = async (id, topicData) => {
  const topic = await Topic.findByPk(id);
  if (!topic) return null;
  await topic.update(topicData);
  return topic;
};

exports.deleteTopic = async (id) => {
  const topic = await Topic.findByPk(id);
  if (!topic) return false;
  
  await topic.destroy();
  return true;
};