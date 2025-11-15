const { User, Post, Follow, BlockedUser, PostLike, Sequelize, Tag, Repost} = require("../models");
const notificationService = require('../service/notification.service');

const isBlocked = async (userId1, userId2) => {
  const block = await BlockedUser.findOne({
    where: {
      [Sequelize.Op.or]: [
        { blockerId: userId1, blockedId: userId2 },
        { blockerId: userId2, blockedId: userId1 },
      ],
    },
  });
  return block;
};

exports.followUser = async (followerId, followingId, io, onlineUsers) => {
  // Chuẩn hóa kiểu dữ liệu để đảm bảo so sánh và truy vấn chính xác
  const parsedFollowerId = parseInt(followerId, 10);
  const parsedFollowingId = parseInt(followingId, 10);

  if (parsedFollowerId === parsedFollowingId) {
    throw new Error('Bạn không thể tự theo dõi chính mình');
  }

  // 1. Kiểm tra xem người được follow (followingId) có chặn người đi follow (followerId) không.
  const isBlockedByTarget = await BlockedUser.findOne({
    where: { blockerId: followingId, blockedId: followerId }
  });
  if (isBlockedByTarget) {
    throw new Error('Không thể thực hiện hành động này do bị chặn.');
  }

  // 2. Kiểm tra xem đã follow trước đó chưa
  const existingFollow = await Follow.findOne({ where: { followerId: parsedFollowerId, followingId: parsedFollowingId } });
  if (existingFollow) {
    throw new Error('Bạn đã theo dõi người dùng này rồi.');
  }

  // 3. Tạo bản ghi follow
  const newFollow = await Follow.create({ followerId: parsedFollowerId, followingId: parsedFollowingId });

  // 4. Kiểm tra follow ngược lại để cập nhật trạng thái `isFriend`
  const reverseFollow = await Follow.findOne({ where: { followerId: parsedFollowingId, followingId: parsedFollowerId } });

  if (reverseFollow) {
    // Nếu có follow ngược lại -> họ là bạn bè
    console.log("status",newFollow);
    
    await newFollow.update({ isFriend: true });
    await reverseFollow.update({ isFriend: true });
    newFollow.dataValues.isFriend = true; // Cập nhật trực tiếp vào dataValues để trả về trong response

    // Gửi thông báo "trở thành bạn bè" cho cả hai
    await notificationService.createNotification({
      recipientId: followingId,
      senderId: followerId,
      type: 'new_friend',
      entityId: followerId
    }, io, onlineUsers);
    await notificationService.createNotification({
      recipientId: followerId, // Gửi cho cả người vừa follow
      senderId: followingId,
      type: 'new_friend',
      entityId: followingId
    }, io, onlineUsers);
  } else {
    newFollow.dataValues.isFriend = false; // Đảm bảo trường isFriend: false luôn có trong response
    // Nếu không phải là bạn bè, chỉ gửi thông báo "new_follower"
    await notificationService.createNotification({
      recipientId: followingId,
      senderId: followerId,
      type: 'new_follower',
      entityId: followerId
    }, io, onlineUsers);
  }

  return newFollow;
};

exports.unfollowUser = async (followerId, followingId) => {
  const follow = await Follow.findOne({ where: { followerId, followingId } });
  if (!follow) {
    throw new Error('Bạn chưa theo dõi người dùng này');
  }

  // Nếu trước đó là bạn bè, cập nhật lại trạng thái của mối quan hệ ngược lại
  if (follow.isFriend) {
    const reverseFollow = await Follow.findOne({ where: { followerId: followingId, followingId: followerId } });
    if (reverseFollow) {
      await reverseFollow.update({ isFriend: false });
    }
  }

  await follow.destroy();
  return { message: 'Đã bỏ theo dõi thành công' };
};

exports.blockUser = async (blockerId, blockedId) => {
  if (blockerId === blockedId) {
    throw new Error('You cannot block yourself');
  }
  // When blocking, force an unfollow in both directions
  await Follow.destroy({ where: { followerId: blockerId, followingId: blockedId } });
  await Follow.destroy({ where: { followerId: blockedId, followingId: blockerId } });

  const existingBlock = await BlockedUser.findOne({ where: { blockerId, blockedId } });
  if (existingBlock) {
    return existingBlock;
  }
  return await BlockedUser.create({ blockerId, blockedId });
};

exports.unblockUser = async (blockerId, blockedId) => {
  const block = await BlockedUser.findOne({ where: { blockerId, blockedId } });
  if (!block) {
    throw new Error('You have not blocked this user');
  }
  await block.destroy();
  return { message: 'Unblocked successfully' };
};

exports.getFollowers = async (targetUserId, currentUserId) => {
  const blockedByUser = await BlockedUser.findAll({
    where: { blockerId: currentUserId },
    attributes: ['blockedId']
  }).then(blocks => blocks.map(b => b.blockedId));

  const usersWhoBlocked = await BlockedUser.findAll({
    where: { blockedId: currentUserId },
    attributes: ['blockerId']
  }).then(blocks => blocks.map(b => b.blockerId));

  const excludedIds = [...blockedByUser, ...usersWhoBlocked];

  return await User.findByPk(targetUserId, {
    include: [{
      model: User,
      as: 'Followers',
      attributes: ['id', 'username', 'avatar', 'bio'],
      through: { attributes: [] },
      where: {
        id: {
          [Sequelize.Op.notIn]: excludedIds
        }
      },
      required: false
    }]
  });
};

exports.getFollowing = async (userId) => {
  return await User.findByPk(userId, {
    include: [{
      model: User,
      as: 'Following',
      attributes: ['id', 'username', 'avatar', 'bio'],
      through: { attributes: [] }
    }]
  });
};

exports.getBlockedUsers = async (userId) => {
  return await User.findByPk(userId, {
    include: [{
      model: User,
      as: 'BlockedUsers',
      attributes: ['id', 'username', 'avatar', 'bio'],
      through: { attributes: [] }
    }]
  });
};

exports.getFriends = async (userId) => {
  const friendFollows = await Follow.findAll({
    where: {
      followerId: userId,
      isFriend: true
    },
    attributes: ['followingId']
  });

  const friendIds = friendFollows.map(f => f.followingId);

  return await User.findAll({
    where: {
      id: {
        [Sequelize.Op.in]: friendIds
      }
    },
    attributes: ['id', 'username', 'avatar', 'bio']
  });
};

exports.getUsersWhoBlockedMe = async (currentUserId) => {
  return await User.findByPk(currentUserId, {
    include: [{
      model: User,
      as: 'BlockedByUsers', // Giả định association này đã được định nghĩa trong User model
      attributes: ['id', 'username', 'avatar', 'bio'],
      through: { attributes: [] }
    }]
  });
};

exports.getAllUser = async (currentUserId, searchQuery) => {
  const whereClause = {};
  let excludedIds = [];

  // 1. Nếu người dùng đã đăng nhập, lấy danh sách block
  if (currentUserId) {
    const blockedByUser = await BlockedUser.findAll({
      where: { blockerId: currentUserId },
      attributes: ['blockedId']
    }).then(blocks => blocks.map(b => b.blockedId));

    const usersWhoBlocked = await BlockedUser.findAll({
      where: { blockedId: currentUserId },
      attributes: ['blockerId']
    }).then(blocks => blocks.map(b => b.blockerId));

    excludedIds = [...blockedByUser, ...usersWhoBlocked, currentUserId]; // Loại cả chính mình
  }

  // 2. Thêm điều kiện loại trừ vào câu truy vấn
  if (excludedIds.length > 0) {
    whereClause.id = { [Sequelize.Op.notIn]: excludedIds };
  }

  // 3. Nếu có query tìm kiếm, thêm điều kiện tìm theo username
  if (searchQuery) {
    whereClause.username = {
      [Sequelize.Op.like]: `%${searchQuery}%`
    };
  }

  return await User.findAll({
    where: whereClause,
    attributes: [
      'id',
      'username',
      'avatar',
      'bio',
      [
        Sequelize.literal(`(SELECT COUNT(*) FROM Follows WHERE followingId = User.id)`),
        'followerCount'
      ],
      [
        Sequelize.literal(`(SELECT COUNT(*) FROM Follows WHERE followerId = User.id)`),
        'followingCount'
      ],
      [Sequelize.literal(`(SELECT COUNT(*) FROM postLikes WHERE postId IN (SELECT id FROM posts WHERE authorId = User.id))`), 'totalLikes'],
    ],
    include: [
      {
        model: Post,
        as: 'posts',
        attributes: [],
        required: false,
        include: [{
          model: PostLike,
          as: 'likes',
          attributes: [],
          required: false,
        }]
      },
      {
        model: Follow,
        as: 'FollowersCount',
        attributes: [],
        required: false,
      },
      {
        model: Follow,
        as: 'FollowingCount',
        attributes: [],
        required: false,
      }
    ],
    group: ['User.id'],
  });
};

exports.getUserById = async (targetUserId, currentUserId) => {
  // Logic kiểm tra block đã được chuyển hoàn toàn sang middleware `checkBlock`.
  // Hàm này giờ chỉ có nhiệm vụ lấy thông tin user.
  const user = await User.findByPk(targetUserId, {
    attributes: {
      exclude: ['password', 'verify_token', 'reset_password_otp', 'verify_token_expires_at', 'reset_password_otp_expires_at']
    },
    include: [
      {
        model: User,
        as: 'Followers',
        attributes: ['id'], // Chỉ cần lấy id để đếm, giảm tải dữ liệu
        through: { attributes: [] }
      },
      {
        model: User,
        as: 'Following',
        attributes: ['id'], // Chỉ cần lấy id để đếm, giảm tải dữ liệu
        through: { attributes: [] }
      }
    ]
  });

  if (user) {
    // Thêm trạng thái follow vào đối tượng user
    const followStatus = await exports.getFollowStatus(currentUserId, targetUserId);
    user.dataValues.followStatus = followStatus;
  }

  return user;
};

exports.updateUser = async (id, userData) => {
  console.log("userdata",userData);
  
  const user = await User.findByPk(id);
  if (!user) return null;
  await user.update(userData);
  // Tải lại user với các trường đã được loại trừ để đảm bảo dữ liệu trả về là an toàn
  const updatedUser = await User.findByPk(id, {
    attributes: {
      exclude: ['password', 'verify_token', 'reset_password_otp', 'verify_token_expires_at', 'reset_password_otp_expires_at']
    }
  });
  return updatedUser;
};

exports.deleteUser = async (id) => {
  const user = await User.findByPk(id);
  if (!user) return false;
  
  await user.destroy();
  return true;
};

exports.updateAvatar = async (userId, avatarPath) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error("User not found");
  }
  user.avatar = avatarPath;
  await user.save();
  return user;
};

exports.getUserPosts = async (targetUserId, currentUserId) => {
  const user = await User.findByPk(targetUserId, {
    include: [{
      model: Post,
      as: 'posts'
    }]
  });
  if (!user) throw new Error("User not found");
  return user.posts;
};

/**
 * Lấy tất cả các bài viết mà một người dùng đã đăng lại (repost).
 * @param {number} targetUserId - ID của người dùng có danh sách repost cần lấy.
 * @param {number|null} currentUserId - ID của người dùng đang xem.
 * @returns {Promise<Post[]>}
 */
exports.getUserReposts = async (targetUserId, currentUserId) => {
  // Lấy các bản ghi repost của người dùng mục tiêu, bao gồm cả thông tin bài viết gốc
  const reposts = await Repost.findAll({
    where: { userId: targetUserId },
    include: [
      {
        model: Post,
        as: 'post',
        include: [
          { model: User, as: 'author', attributes: ['id', 'username', 'avatar', 'bio'] },
          { model: Tag, as: 'tags', attributes: ['id', 'name'], through: { attributes: [] } },
        ],
        attributes: {
          include: [
            [
              Sequelize.literal(`(SELECT COUNT(*) FROM PostLikes WHERE PostLikes.postId = \`post\`.\`id\`)`),
              'likesCount',
            ],
            [
              Sequelize.literal(`(SELECT COUNT(*) FROM Reposts WHERE Reposts.postId = \`post\`.\`id\`)`),
              'repostCount',
            ],
          ],
        },
      },
    ],
    order: [['createdAt', 'DESC']], // Sắp xếp theo thời gian repost mới nhất
  });

  // Trích xuất các đối tượng bài viết từ kết quả repost
  const posts = reposts.map(repost => repost.post).filter(Boolean); // Lọc ra các post null nếu có

  // Thêm trạng thái isLiked và isReposted cho người dùng hiện tại
  if (posts.length > 0 && currentUserId) {
    const postIds = posts.map(p => p.id);

    const [userLikes, userReposts] = await Promise.all([
      PostLike.findAll({
        where: { postId: { [Sequelize.Op.in]: postIds }, userId: currentUserId },
        attributes: ['postId'],
      }),
      Repost.findAll({
        where: { postId: { [Sequelize.Op.in]: postIds }, userId: currentUserId },
        attributes: ['postId'],
      }),
    ]);

    const likedPostIds = new Set(userLikes.map(l => l.postId));
    const repostedPostIds = new Set(userReposts.map(r => r.postId));

    posts.forEach(post => {
      post.dataValues.isLiked = likedPostIds.has(post.id);
      post.dataValues.isReposted = repostedPostIds.has(post.id);
    });
  }

  return posts;
};

exports.getUserVideosByUsername = async (targetUsername, currentUserId) => {
  const targetUser = await User.findOne({
    where: { username: targetUsername },
    attributes: ['id', 'username', 'avatar', 'bio']
  });

  if (!targetUser) {
    throw new Error("User not found");
  }

  const targetUserId = targetUser.id;

  // Kiểm tra chặn: Nếu người xem bị chủ sở hữu chặn hoặc ngược lại
  if (currentUserId) {
    const isCurrentUserBlockedByTarget = await isBlocked(targetUserId, currentUserId);
    const isTargetUserBlockedByCurrentUser = await isBlocked(currentUserId, targetUserId);

    if (isCurrentUserBlockedByTarget || isTargetUserBlockedByCurrentUser) {
      throw new Error("Bạn không có quyền truy cập người dùng này.");
    }
  }

  let allowedVisibilities = ['public'];

  if (currentUserId) {
    if (currentUserId === targetUserId) {
      // Nếu là chủ sở hữu, có thể xem tất cả video
      allowedVisibilities = ['public', 'friends', 'private'];
    } else {
      // Kiểm tra xem currentUserId có phải là bạn bè của targetUser không
      const areFriends = await exports.areTheyFriends(currentUserId, targetUserId);
      if (areFriends) {
        allowedVisibilities = ['public', 'friends'];
      }
      // Nếu không phải bạn bè, mặc định vẫn là 'public'
    }
  }

  const videos = await Post.findAll({
    where: {
      authorId: targetUserId,
      visibility: { [Sequelize.Op.in]: allowedVisibilities },
      [Sequelize.Op.and]: [
        Sequelize.literal('Post.media IS NOT NULL'), // Đảm bảo trường media không null
        Sequelize.literal('JSON_LENGTH(Post.media) > 0'), // Đảm bảo mảng media không rỗng
        Sequelize.literal("JSON_EXTRACT(Post.media, '$[0].type') = 'video'") // Kiểm tra type của phần tử đầu tiên
      ]
    },
    order: [['createdAt', 'DESC']],
    include: [
      { model: User, as: 'author', attributes: ['id', 'username', 'avatar', 'bio'] },
      { model: Tag, as: 'tags', attributes: ['id', 'name'], through: { attributes: [] } },
    ],
    attributes: { include: [[Sequelize.col("viewCount"), "viewCount"]] },
  });

  return videos;
};

exports.checkUsernameExists = async (username) => {
  const user = await User.findOne({
    where: {
      username: username,
    },
  });
  return !!user; // Returns true if user exists, false otherwise
};

exports.getFollowerIds = async (userId) => {
  const follows = await Follow.findAll({
    where: { followingId: userId },
    attributes: ['followerId'],
  });
  return follows.map((follow) => follow.followerId);
};

exports.getFollowingIds = async (userId) => {
  const follows = await Follow.findAll({
    where: { followerId: userId },
    attributes: ['followingId'],
  });
  return follows.map((follow) => follow.followingId);
};


exports.getFriendIds = async (userId) => {
  const friendFollows = await Follow.findAll({
    where: {
      followerId: userId,
      isFriend: true
    },
    attributes: ['followingId']
  });
  return friendFollows.map(f => f.followingId);
};

/**
 * Kiểm tra xem hai người dùng có phải là bạn bè không.
 * @param {number} userId1 - ID người dùng 1.
 * @param {number} userId2 - ID người dùng 2.
 * @returns {Promise<boolean>} - True nếu là bạn bè, ngược lại là false.
 */
exports.areTheyFriends = async (userId1, userId2) => {
  const friendship = await Follow.findOne({
    where: { followerId: userId1, followingId: userId2, isFriend: true }
  });
  return !!friendship;
};

exports.getFollowStatus = async (currentUserId, targetUserId) => {
  if (!currentUserId) {
    return "Follow"; // If not logged in, always show "Follow"
  }

  if (currentUserId === targetUserId) {
    return "You"; // Current user is the target user
  }

  // Check if current user is blocking target user or vice versa
  const isCurrentUserBlocking = await isBlocked(currentUserId, targetUserId);
  const isTargetUserBlocking = await isBlocked(targetUserId, currentUserId);

  if (isCurrentUserBlocking || isTargetUserBlocking) {
    return "Blocked"; // Or handle as appropriate, e.g., "Cannot view profile"
  }

  const isFollowing = await Follow.findOne({
    where: { followerId: currentUserId, followingId: targetUserId },
  });

  const isFollowedByTarget = await Follow.findOne({
    where: { followerId: targetUserId, followingId: currentUserId },
  });

  if (isFollowing && isFollowedByTarget) {
    return "Friends";
  } else if (isFollowing) {
    return "Following";
  } else {
    return "Follow";
  }
};

exports.getBlockedUserIds = async (currentUserId) => {
const blockedByUser = await BlockedUser.findAll({
  where: { blockerId: currentUserId },
  attributes: ['blockedId']
}).then(blocks => blocks.map(b => b.blockedId));

const usersWhoBlocked = await BlockedUser.findAll({
  where: { blockedId: currentUserId },
  attributes: ['blockerId']
}).then(blocks => blocks.map(b => b.blockerId));

return [...new Set([...blockedByUser, ...usersWhoBlocked])];
};
