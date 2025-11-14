const { Post, User, PostLike, Tag, HashtagGroup, Repost, Sequelize } = require("@/models");
const { Op } = require("sequelize");
const userService = require("@/service/user.service");
const fs = require("fs");
const removeAccents = require("remove-accents");
const { generateThumbnail } = require("../utils/thumbnail");
const notificationService = require("../service/notification.service");

// --- HASHTAG GROUP SETUP ---
const HASHTAG_GROUP_KEYWORDS = {
  'Ẩm thực': ['amthuc', 'anngon', 'nauan', 'monngon', 'anuong', 'doan', 'nhahang', 'bepnha', 'food', 'eat'],
  'Thể thao': ['thethao', 'bongda', 'bongro', 'tapgym', 'chaybo', 'bongchuyen', 'bongban', 'theduc', 'sport'],
  'Công nghệ': ['congnghe', 'tech', 'dienthoai', 'laptrinh', 'ai', 'iot', 'khoahoc', 'maytinh', 'thongminh', 'technology'],
  'Đời sống': ['doisong', 'giadinh', 'tinhyeu', 'thoitiet', 'dulich', 'cuocsong', 'nhanvan', 'xahoi', 'life', 'travel'],
  'Giải trí': ['giaitri', 'amnhac', 'phimanh', 'showbiz', 'idol', 'vlog', 'tiktok', 'funny', 'hailong', 'entertainment'],
  'Giáo dục': ['giaoduc', 'hocvan', 'truonghoc', 'hoctap', 'kienthuc', 'kynang', 'daotao', 'education', 'learn'],
  'Kinh doanh': ['kinhdoanh', 'doanhnhan', 'dautu', 'taichinh', 'marketing', 'thuongmai', 'startup', 'business'],
  'Thời trang': ['thoitrang', 'phongcach', 'outfit', 'fashion', 'quanao', 'guongmat', 'style'],
  'Sức khỏe': ['suckhoe', 'lamdep', 'taptheduc', 'dinhduong', 'chamsoc', 'benhly', 'yte', 'health', 'beauty'],
};
let hashtagGroupsCache = {};

const loadHashtagGroups = async () => {
  const groups = await HashtagGroup.findAll();
  hashtagGroupsCache = groups.reduce((acc, g) => {
    acc[g.name] = g.id;
    return acc;
  }, {});
};
loadHashtagGroups();

const extractHashtags = (text) => text ? text.match(/#(\w+)/g) || [] : [];
const extractMentions = (text) => {
  if (!text) return [];
  const regex = /@(\w+)/g;
  const matches = text.match(regex);
  return matches ? [...new Set(matches.map(m => m.substring(1)))] : [];
};

exports.getPrioritizedFeedForUser = async (currentUserId, options = {}) => {
  const { limit = 10, offset = 0, excludedPostIds = [] } = options;
  const baseInclude = [
    {
      model: User,
      as: "author",
      attributes: ["id", "username", "avatar", "bio"],
    },
    {
      model: Tag,
      as: "tags",
      attributes: ["id", "name"],
      through: { attributes: [] },
    },
  ];

  const baseAttributes = {
    include: [
      [
        Sequelize.literal(
          `(SELECT COUNT(*) FROM PostLikes WHERE PostLikes.postId = Post.id)`
        ),
        "likesCount",
      ],
      [
        Sequelize.literal(
          `(SELECT COUNT(*) FROM Reposts WHERE Reposts.postId = Post.id)`
        ),
        "repostCount",
      ],
      [
        Sequelize.literal(
          `(SELECT COUNT(*) FROM Comments WHERE Comments.postId = Post.id)`
        ),
        "commentCount",
      ],
    ],
  };

  // --- Người dùng chưa đăng nhập ---
  if (!currentUserId) {
    return Post.findAll({
      where: {
        visibility: "public",
        id: { [Op.notIn]: excludedPostIds },
      },
      order: [["publishedAt", "DESC"]],
      limit,
      offset,
      include: baseInclude,
      attributes: baseAttributes,
    });
  }
 // --- Người dùng đã đăng nhập ---
 const friends = await userService.getFriends(currentUserId);
const followers = await userService.getFollowers(currentUserId, currentUserId);

// Lấy mảng ID từ friend objects
const friendIds = Array.isArray(friends) ? friends.map(u => u.id) : [];

// Lấy mảng ID từ follower objects
let followingIds = [];
if (Array.isArray(followers)) {
  followingIds = followers.map(u => u.id);
} else if (followers) {
  followingIds = [followers.id]; // Nếu trả về 1 object
}

// Lấy ID của người chỉ follow (không phải bạn bè)
const followingOnlyIds = followingIds.filter(id => !friendIds.includes(id));

console.log('friendIds', friendIds);
console.log('followingIds', followingIds);
console.log('followingOnlyIds', followingOnlyIds);

  // Những người khác (không phải bạn, không phải follow, không phải chính mình)
  const excludedUserIds = [...friendIds, ...followingIds, currentUserId];

  let finalPosts = [];

  // --- 1. Bài viết của bạn bè ---
  if (friendIds.length > 0) {
    const posts = await Post.findAll({
      where: {
        authorId: { [Op.in]: friendIds },
        visibility: { [Op.in]: ["public", "friends"] },
        id: { [Op.notIn]: excludedPostIds.concat(finalPosts.map((p) => p.id)) },
      },
      order: [["publishedAt", "DESC"]],
      limit: limit - finalPosts.length,
      include: baseInclude,
      attributes: baseAttributes,
    });
    finalPosts.push(...posts);
  }

  // --- 2. Bài viết của người đang follow ---
  if (followingOnlyIds.length > 0 && finalPosts.length < limit) {
    const posts = await Post.findAll({
      where: {
        authorId: { [Op.in]: followingOnlyIds },
        visibility: "public",
        id: { [Op.notIn]: excludedPostIds.concat(finalPosts.map((p) => p.id)) },
      },
      order: [["publishedAt", "DESC"]],
      limit: limit - finalPosts.length,
      include: baseInclude,
      attributes: baseAttributes,
    });
    finalPosts.push(...posts);
  }

  // --- 3. Bài viết của mọi người khác (public) ---
  if (finalPosts.length < limit) {
    const posts = await Post.findAll({
      where: {
        visibility: "public",
        authorId: { [Op.notIn]: excludedUserIds },
        id: { [Op.notIn]: excludedPostIds.concat(finalPosts.map((p) => p.id)) },
      },
      order: [["publishedAt", "DESC"]],
      limit: limit - finalPosts.length,
      include: baseInclude,
      attributes: baseAttributes,
    });
    finalPosts.push(...posts);
  }

  // --- Thêm trạng thái isLiked và isReposted (Tối ưu hóa) ---
  if (finalPosts.length > 0 && currentUserId) {
    const postIds = finalPosts.map(p => p.id);

    // Lấy tất cả likes và reposts của user hiện tại cho các bài viết này trong 2 truy vấn
    const [userLikes, userReposts] = await Promise.all([
      PostLike.findAll({
        where: { postId: { [Op.in]: postIds }, userId: currentUserId },
        attributes: ['postId']
      }),
      Repost.findAll({
        where: { postId: { [Op.in]: postIds }, userId: currentUserId },
        attributes: ['postId']
      })
    ]);

    // Tạo Set để tra cứu nhanh (O(1))
    const likedPostIds = new Set(userLikes.map(l => l.postId));
    const repostedPostIds = new Set(userReposts.map(r => r.postId));

    // Gán trạng thái vào mỗi bài viết
    finalPosts.forEach(post => {
      post.dataValues.isLiked = likedPostIds.has(post.id);
      post.dataValues.isReposted = repostedPostIds.has(post.id);
    });
  }

  return finalPosts;
};

const processMentions = async (post, text, io, onlineUsers) => {
  const mentionedUsernames = extractMentions(text);
  if (!mentionedUsernames.length) return;
  const mentionedUsers = await User.findAll({ where: { username: { [Op.in]: mentionedUsernames } } });
  await post.setMentionedUsers(mentionedUsers);

  for (const user of mentionedUsers) {
    await notificationService.createNotification(
      { recipientId: user.id, senderId: post.authorId, type: "mention_post", entityId: post.id },
      io,
      onlineUsers
    );
  }
};

exports.createPost = async (postData, files, io, onlineUsers) => {
  // --- xử lý upload ---
  if (files) {
    if (files.video && files.video.length > 0) {
      try {
        // Trường hợp upload video (chỉ 1 video)
        const videoFile = files.video[0];
        // Loại bỏ 'public' và chuẩn hóa thành URL tương đối
        const videoUrl = videoFile.path.replace(/\\/g, "/").replace(/^public/, "");

        // Gọi hàm generateThumbnail để tạo ảnh thu nhỏ
        const thumbnailPath = await generateThumbnail(videoFile.path);
        // Loại bỏ 'public' và chuẩn hóa thành URL tương đối cho thumbnail
        const thumbnailUrl = thumbnailPath.replace(/\\/g, "/").replace(/^public/, "");

        postData.media = [{
          type: "video",
          url: videoUrl,
          thumbnail: thumbnailUrl,
        }];
        postData.featuredImage = thumbnailUrl; // Gán thumbnail làm ảnh đại diện
      } catch (error) {
        console.error("Lỗi khi xử lý video hoặc tạo thumbnail:", error);
        throw new Error("Không thể xử lý video hoặc tạo thumbnail.");
      }
    } else if (files.images && files.images.length > 0) {
      // Trường hợp upload ảnh (tối đa 10)
      postData.media = files.images.map((f) => ({
        type: "image",
        url: f.path.replace(/\\/g, "/").replace(/^public/, ""), // Loại bỏ 'public'
      }));
      postData.featuredImage = postData.media[0].url; // Gán ảnh đầu tiên làm ảnh đại diện
    }
  }

  // --- tạo bài viết ---
  const newPost = await Post.create(postData);

  // mentions
  await processMentions(newPost, postData.content, io, onlineUsers);

  // hashtags
  const hashtags = extractHashtags(postData.content);
  if (hashtags.length > 0) {
    const tagInstances = await Promise.all(
      hashtags.map(async (tagText) => {
        const name = tagText.substring(1);
        const normalized_name = removeAccents(name).toLowerCase();
        let groupId = null;
        for (const groupName in HASHTAG_GROUP_KEYWORDS) {
          if (HASHTAG_GROUP_KEYWORDS[groupName].includes(normalized_name)) {
            groupId = hashtagGroupsCache[groupName];
            break;
          }
        }
        const [tag] = await Tag.findOrCreate({
          where: { normalized_name },
          defaults: { name, normalized_name, groupId },
        });
        return tag;
      })
    );
    await newPost.setTags(tagInstances);
  }

  // --- reload để trả về đầy đủ dữ liệu ---
  await newPost.reload({
    include: [
      { model: User, as: "author", attributes: ["id", "username", "avatar", "bio"] },
      { model: Tag, as: "tags", attributes: ["id", "name"], through: { attributes: [] } },
    ],
    attributes: { include: [[Sequelize.col("viewCount"), "viewCount"]] },
  });

  return newPost;
};

// Handle view
exports.incrementViewCount = async (postId) => { 
  const post = await Post.findByPk(postId, { attributes: ['id'] });
  if (!post) { throw new Error('Post not found'); } 
  await post.increment('viewCount', { by: 1 }); 
  return { message: 'View count incremented successfully' }; 
};

exports.getPostByIdWithAuthorAndTopic = async (postId, currentUserId = null) => {
  // Lấy bài viết
  const post = await Post.findOne({
    where: { id: postId },
    include: [
      {
        model: User,
        as: "author",
        attributes: ["id", "username", "avatar", "bio"],
      },
      {
        model: Tag,
        as: "tags",
        attributes: ["id", "name"],
        through: { attributes: [] },
      },
    ],
    attributes: {
      include: [
        [Sequelize.col("viewCount"), "viewCount"]
        ,
        [
          Sequelize.literal(
            `(SELECT COUNT(*) FROM PostLikes WHERE PostLikes.postId = Post.id)`
          ),
          "likesCount",
        ],
        [
          Sequelize.literal(
            `(SELECT COUNT(*) FROM Reposts WHERE Reposts.postId = Post.id)`
          ),
          "repostCount",
        ],
        [
          Sequelize.literal(
            `(SELECT COUNT(*) FROM Comments WHERE Comments.postId = Post.id)`
          ),
          "commentCount",
        ],
      ],
    },
  });

  if (!post) return null;

  // Kiểm tra xem user đã like và repost bài này chưa
  if (currentUserId) {
    const [userLike, userRepost] = await Promise.all([
      PostLike.findOne({
        where: { postId: post.id, userId: currentUserId },
        attributes: ['id']
      }),
      Repost.findOne({
        where: { postId: post.id, userId: currentUserId },
        attributes: ['id']
      })
    ]);
    post.dataValues.isLiked = !!userLike;
    post.dataValues.isReposted = !!userRepost;
  } else {
    post.dataValues.isLiked = false;
    post.dataValues.isReposted = false;
  }

  return post;
};

// ============================================================================
// 🟡 UPDATE POST (ĐỒNG BỘ uploadPostFields)
// ============================================================================
exports.updatePost = async (postId, postData, authorId, files, io, onlineUsers) => {
  const post = await Post.findOne({ where: { id: postId, authorId } });
  if (!post) return null;

  // xử lý lại upload nếu có file mới
  if (files) {
    if (files.video && files.video.length > 0) {
      const file = files.video[0];
      const videoUrl = file.path.replace(/\\/g, "/").replace(/^public/, "");
      const thumbnailUrl = file.thumbnail ? file.thumbnail.replace(/\\/g, "/").replace(/^public/, "") : null;
      postData.media = [
        {
          type: "video",
          url: videoUrl,
          thumbnail: thumbnailUrl,
        },
      ];
    } else if (files.images && files.images.length > 0) {
      postData.media = files.images.map((f) => ({
        type: "image",
        url: f.path.replace(/\\/g, "/").replace(/^public/, ""),
      }));
    }
  }

  await post.update(postData);

  await processMentions(post, postData.content, io, onlineUsers);

  if (postData.content) {
    const hashtags = extractHashtags(postData.content);
    const tagInstances = await Promise.all(
      hashtags.map(async (tagText) => {
        const name = tagText.substring(1);
        const normalized_name = removeAccents(name).toLowerCase();
        let groupId = null;
        for (const groupName in HASHTAG_GROUP_KEYWORDS) {
          if (HASHTAG_GROUP_KEYWORDS[groupName].includes(normalized_name)) {
            groupId = hashtagGroupsCache[groupName];
            break;
          }
        }
        const [tag] = await Tag.findOrCreate({
          where: { normalized_name },
          defaults: { name, normalized_name, groupId },
        });
        return tag;
      })
    );
    await post.setTags(tagInstances);
  }

  return await this.getPostByIdWithAuthorAndTopic(postId, authorId);
};

exports.deletePost = async (postId, authorId) => {
  const post = await Post.findOne({ where: { id: postId, authorId } });
  if (!post) {
    return false; // Không tìm thấy bài viết hoặc không có quyền xóa
  }

  // Xóa file media liên quan (nếu có)
  if (post.media && post.media.length > 0) {
    post.media.forEach(mediaItem => {
      // Xóa file chính
      if (mediaItem.url) {
        const filePath = `public${mediaItem.url}`;
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      // Xóa thumbnail (nếu là video)
      if (mediaItem.thumbnail) {
        const thumbPath = `public${mediaItem.thumbnail}`;
        if (fs.existsSync(thumbPath)) {
          fs.unlinkSync(thumbPath);
        }
      }
    });
  }

  await post.destroy(); // Sequelize sẽ xử lý xóa các bản ghi liên quan nếu đã cấu hình `onDelete: 'CASCADE'`
  return true;
};

exports.likePost = async (postId, userId) => {
  const post = await Post.findByPk(postId);
  if (!post) {
    throw new Error("Bài viết không tồn tại");
  }

  const existingLike = await PostLike.findOne({ where: { postId, userId } });
  if (existingLike) {
    return existingLike; // Trả về like đã tồn tại
  }

  const like = await PostLike.create({ postId, userId });

  // Tạo thông báo cho chủ bài viết
  if (post.authorId !== userId) {
    await notificationService.createNotification({
      recipientId: post.authorId,
      senderId: userId,
      type: 'like_post',
      entityId: post.id
    });
  }

  return like;
};

exports.unlikePost = async (postId, userId) => {
  const like = await PostLike.findOne({ where: { postId, userId } });
  if (!like) {
    throw new Error("Bạn chưa thích bài viết này");
  }

  await like.destroy();
  return { message: "Đã bỏ thích bài viết thành công" };
};

exports.deletePostMedia = async (postId, mediaIndex, userId) => {
  // Logic để xóa media cụ thể, bạn có thể triển khai sau nếu cần.
  return null;
};

exports.getVisiblePostsForUser = async (targetUserId, currentUserId) => {
  let allowedVisibilities = ['public'];

  if (currentUserId) {
    if (currentUserId === targetUserId) {
      // Chủ sở hữu xem được tất cả
      allowedVisibilities = ['public', 'friends', 'private'];
    } else {
      // Kiểm tra có phải bạn bè không
      const areFriends = await userService.areTheyFriends(currentUserId, targetUserId);
      if (areFriends) {
        allowedVisibilities.push('friends');
      }
    }
  }

  return await Post.findAll({
    where: {
      authorId: targetUserId,
      visibility: { [Op.in]: allowedVisibilities },
    },
    include: [
      { model: User, as: 'author', attributes: ['id', 'username', 'avatar'] },
      { model: Tag, as: 'tags', attributes: ['id', 'name'], through: { attributes: [] } },
    ],
    order: [['publishedAt', 'DESC']],
    attributes: {
      include: [
        [
          Sequelize.literal(`(SELECT COUNT(*) FROM PostLikes WHERE PostLikes.postId = Post.id)`),
          "likesCount",
        ],
        [
          Sequelize.literal(`(SELECT COUNT(*) FROM Reposts WHERE Reposts.postId = Post.id)`),
          "repostCount",
        ],
        [
          Sequelize.literal(
            `(SELECT COUNT(*) FROM Comments WHERE Comments.postId = Post.id)`
          ),
          "commentCount",
        ],
      ],
    }
  });
};

/**
 * Lấy bài viết theo hashtag.
 * @param {string} tagName - Tên hashtag (không bao gồm '#').
 * @param {number|null} currentUserId - ID của người dùng đang xem.
 * @returns {Promise<Post[]>}
 */
exports.getPostsByHashtag = async (tagName, currentUserId) => {
  const normalizedTagName = removeAccents(tagName).toLowerCase();

  const whereClause = {
    visibility: 'public' // Mặc định chỉ tìm bài public
  };

  // Nếu người dùng đã đăng nhập, loại trừ các bài viết từ người dùng bị chặn
  if (currentUserId) {
    const blockedUserIds = await userService.getBlockedUserIds(currentUserId);
    if (blockedUserIds.length > 0) {
      whereClause.authorId = { [Op.notIn]: blockedUserIds };
    }
  }

  const posts = await Post.findAll({
    where: whereClause,
    include: [
      {
        model: Tag,
        as: 'tags',
        where: { normalized_name: normalizedTagName },
        attributes: [], // Không cần lấy thông tin tag ở đây
        through: { attributes: [] },
      },
      {
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'avatar', 'bio'],
      },
    ],
    order: [['publishedAt', 'DESC']],
    attributes: {
      include: [
        [
          Sequelize.literal(`(SELECT COUNT(*) FROM PostLikes WHERE PostLikes.postId = Post.id)`),
          "likesCount",
        ],
        [
          Sequelize.literal(`(SELECT COUNT(*) FROM Reposts WHERE Reposts.postId = Post.id)`),
          "repostCount",
        ],
        [
          Sequelize.literal(
            `(SELECT COUNT(*) FROM Comments WHERE Comments.postId = Post.id)`
          ),
          "commentCount",
        ],
      ],
    }
  });

  return posts;
};

/**
 * Lấy bài viết theo người dùng được mention.
 * @param {string} username - Username của người được mention.
 * @param {number|null} currentUserId - ID của người dùng đang xem.
 * @returns {Promise<Post[]>}
 */
exports.getPostsByMentionedUser = async (username, currentUserId) => {
  const mentionedUser = await User.findOne({ where: { username } });
  if (!mentionedUser) return [];

  const whereClause = {
    visibility: 'public'
  };

  if (currentUserId) {
    const blockedUserIds = await userService.getBlockedUserIds(currentUserId);
    if (blockedUserIds.length > 0) {
      whereClause.authorId = { [Op.notIn]: blockedUserIds };
    }
  }

  return await Post.findAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'mentionedUsers',
        where: { id: mentionedUser.id },
        attributes: [],
        through: { attributes: [] },
      },
      {
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'avatar', 'bio'],
      },
      {
        model: Tag,
        as: 'tags',
        attributes: ['id', 'name'],
        through: { attributes: [] },
      },
    ],
    order: [['publishedAt', 'DESC']],
    attributes: {
      include: [
        [
          Sequelize.literal(`(SELECT COUNT(*) FROM PostLikes WHERE PostLikes.postId = Post.id)`),
          "likesCount",
        ],
        [
          Sequelize.literal(`(SELECT COUNT(*) FROM Reposts WHERE Reposts.postId = Post.id)`),
          "repostCount",
        ],
        [
          Sequelize.literal(
            `(SELECT COUNT(*) FROM Comments WHERE Comments.postId = Post.id)`
          ),
          "commentCount",
        ],
      ],
    }
  });
};

exports.getPostsByContent = async (query, currentUserId) => {
  // Hàm này hiện tại chưa được triển khai đầy đủ logic tìm kiếm phức tạp.
  // Bạn có thể thêm logic tìm kiếm toàn văn (full-text search) ở đây.
  // Tạm thời trả về mảng rỗng.
  return [];
};

/**
 * Đăng lại một bài viết.
 * @param {number} postId - ID của bài viết cần đăng lại.
 * @param {number} userId - ID của người dùng thực hiện đăng lại.
 * @returns {Promise<Repost>}
 */
exports.repostPost = async (postId, userId) => {
  const post = await Post.findByPk(postId);
  if (!post) {
    throw new Error("Bài viết không tồn tại.");
  }

  if (post.authorId === userId) {
    throw new Error("Bạn không thể đăng lại bài viết của chính mình.");
  }

  const existingRepost = await Repost.findOne({ where: { postId, userId } });
  if (existingRepost) {
    throw new Error("Bạn đã đăng lại bài viết này rồi.");
  }

  const repost = await Repost.create({ postId, userId });

  // Tạo thông báo cho chủ bài viết
  await notificationService.createNotification({
    recipientId: post.authorId,
    senderId: userId,
    type: 'repost',
    entityId: post.id,
  });

  return repost;
};

/**
 * Hủy đăng lại một bài viết.
 * @param {number} postId - ID của bài viết đã đăng lại.
 * @param {number} userId - ID của người dùng thực hiện hủy.
 * @returns {Promise<{message: string}>}
 */
exports.undoRepostPost = async (postId, userId) => {
  const repost = await Repost.findOne({ where: { postId, userId } });
  if (!repost) {
    throw new Error("Bạn chưa đăng lại bài viết này.");
  }

  await repost.destroy();
  return { message: "Đã hủy đăng lại thành công." };
};
