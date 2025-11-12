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
      [Sequelize.col("viewCount"), "viewCount"],
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

  // --- Thêm trạng thái isLiked ---
  for (const post of finalPosts) {
    const userLike = await PostLike.findOne({
      where: { postId: post.id, userId: currentUserId },
    });
    post.dataValues.isLiked = !!userLike;
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
      ],
    },
  });

  if (!post) return null;

  // Kiểm tra xem user đã like bài này chưa
  if (currentUserId) {
    const userLike = await PostLike.findOne({
      where: { postId: post.id, userId: currentUserId },
    });
    post.dataValues.isLiked = !!userLike;
  } else {
    post.dataValues.isLiked = false;
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
