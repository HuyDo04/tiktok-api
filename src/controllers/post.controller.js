const postService = require("@/service/post.service");

// Lấy feed (bài viết ưu tiên) cho trang chủ
exports.getAllPosts = async (req, res) => {
  try {
    const currentUserId = req.user?.id || null;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const excludedPostIds = Array.isArray(req.body?.excludedPostIds)
      ? req.body.excludedPostIds.map(String).filter(Boolean)
      : req.query.excludedPostIds?.split(',').map(String).filter(Boolean) || [];

    const posts = await postService.getPrioritizedFeedForUser(currentUserId, {
      limit,
      offset,
      excludedPostIds,
    });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy bài viết", error: error.message });
  }
};

// Lấy bài viết theo ID
exports.getPostById = async (req, res) => {
  try {
    const currentUserId = req.user?.id || null;
    const post = await postService.getPostByIdWithAuthorAndTopic(req.params.id, currentUserId);
    if (!post) return res.status(404).json({ message: "Bài viết không tồn tại" });
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy chi tiết bài viết", error: error.message });
  }
};

// view


// Lấy bài viết theo slug
exports.getPostBySlug = async (req, res) => {
  try {
    const currentUserId = req.user?.id || null;
    const post = await postService.getPostBySlug(req.params.slug, currentUserId);
    if (!post) return res.status(404).json({ message: "Bài viết không tồn tại" });
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy chi tiết bài viết", error: error.message });
  }
};

// Tạo bài viết mới
exports.createPost = async (req, res) => {
  try {
    const authorId = req.user.id;

    // --- VALIDATE: Bắt buộc phải có video hoặc ảnh ---
    const hasVideo = req.files && req.files.video && req.files.video.length > 0;
    const hasImages = req.files && req.files.images && req.files.images.length > 0;
    if (!hasVideo && !hasImages) {
      return res.status(400).json({ message: "Bạn phải đăng kèm video hoặc hình ảnh." });
    }

    const postData = { ...req.body, authorId };
    const newPost = await postService.createPost(postData, req.files, req.io, req.onlineUsers);
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi tạo bài viết", error: error.message });
  }
};

// Cập nhật bài viết
exports.updatePost = async (req, res) => {
  try {
    const authorId = req.user.id;
    const updatedPost = await postService.updatePost(req.params.id, req.body, authorId, req.files, req.io, req.onlineUsers);
    if (!updatedPost) return res.status(404).json({ message: "Bài viết không tồn tại hoặc không có quyền chỉnh sửa" });
    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi cập nhật bài viết", error: error.message });
  }
};

// Xóa bài viết
exports.deletePost = async (req, res) => {
  try {
    const result = await postService.deletePost(req.params.id, req.user.id);
    if (!result) return res.status(404).json({ message: "Bài viết không tồn tại hoặc không có quyền xóa" });
    res.json({ message: "Xóa bài viết thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi xóa bài viết", error: error.message });
  }
};

// Xóa media trong bài viết
exports.deletePostMedia = async (req, res) => {
  try {
    const updatedPost = await postService.deletePostMedia(req.params.id, req.params.mediaIndex, req.user.id);
    res.json({ message: "Xóa media thành công", post: updatedPost });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// Thích bài viết
exports.likePost = async (req, res) => {
  try {
    const like = await postService.likePost(req.params.id, req.user.id);
    res.status(201).json(like);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi thích bài viết", error: error.message });
  }
};

// Bỏ thích bài viết
exports.unlikePost = async (req, res) => {
  try {
    const result = await postService.unlikePost(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi bỏ thích bài viết", error: error.message });
  }
};

// Tăng lượt xem
exports.incrementViewCount = async (req, res) => {
  try {
    const result = await postService.incrementViewCount(req.params.id);
    res.json(result);
  } catch (error) {
    if (error.message === 'Post not found') {
      return res.status(404).json({ message: "Bài viết không tồn tại." });
    }
    res.status(500).json({ message: "Lỗi khi tăng lượt xem", error: error.message });
  }
};

// Đăng lại bài viết
exports.repostPost = async (req, res) => {
  try {
    const repost = await postService.repostPost(req.params.id, req.user.id);
    res.status(201).json({ message: "Đăng lại thành công", repost });
  } catch (error) {
    const msg = error.message.includes('đã đăng lại') || error.message.includes('của chính mình') ? error.message : "Lỗi khi đăng lại bài viết";
    res.status(msg === error.message ? 400 : 500).json({ message: msg });
  }
};

// Hủy đăng lại
exports.undoRepostPost = async (req, res) => {
  try {
    const result = await postService.undoRepostPost(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    const msg = error.message.includes('chưa đăng lại') ? error.message : "Lỗi khi hủy đăng lại";
    res.status(msg === error.message ? 400 : 500).json({ message: msg });
  }
};

// Tìm bài viết theo hashtag
exports.getPostsByHashtag = async (req, res) => {
  try {
    const { tagName } = req.params;
    if (!tagName) return res.status(400).json({ message: "Tên hashtag là bắt buộc." });
    const posts = await postService.getPostsByHashtag(tagName, req.user?.id || null);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ khi tìm bài viết theo hashtag", error: error.message });
  }
};

// Lấy bài viết mention một user
exports.getPostsByMentionedUser = async (req, res) => {
  try {
    const posts = await postService.getPostsByMentionedUser(req.params.username, req.user?.id || null);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy bài viết theo mention", error: error.message });
  }
};
