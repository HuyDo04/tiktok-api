const topicService = require("@/service/topic.service");
// Get all topics
exports.getAllTopics = async (req, res) => {
    try {
      const topics = await topicService.getAllTopicsWithPosts();
      res.json(topics);
    } catch (error) {
      res.status(500).json({ message: "Lỗi lấy danh sách topics", error });
    }
};

// Get topic by ID 
exports.getTopicById = async (req, res) => {
    try {
        const topic = await topicService.getTopicById(req.params.id);
        
        if (!topic) {
            return res.status(404).json({ message: "Topic không tồn tại" });
        }
        res.json(topic);
    } catch (error) {
        res.status(500).json({ message: "Lỗi lấy chi tiết topic", error });
    }
};

// Create new topic
exports.createTopic = async (req, res) => {
    try {
        const topic = await topicService.createTopic(req.body);
        res.status(201).json({
            message: "Tạo topic thành công",
            topic
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi tạo topic", error });
    }
};

// Update topic
exports.updateTopic = async (req, res) => {
    try {
        const topic = await topicService.updateTopic(req.params.id, req.body);
        if (!topic) {
            return res.status(404).json({ message: "Topic không tồn tại" });
        }
        res.json({
            message: "Cập nhật topic thành công",
            topic
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi cập nhật topic", error });
    }
};

// Delete topic
exports.deleteTopic = async (req, res) => {
    try {
        const result = await topicService.deleteTopic(req.params.id);
        if (!result) {
            return res.status(404).json({ message: "Topic không tồn tại" });
        }
        res.json({ message: "Xóa topic thành công" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi xóa topic", error });
    }
};

// Get topic by slug
exports.getTopicBySlug = async (req, res) => {
  try {
    const topic = await topicService.getTopicBySlug(req.params.slug);
    if (!topic) return res.status(404).json({ message: "Topic không tồn tại" });
    
    res.json(topic);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy chi tiết topic", error });
  }
}