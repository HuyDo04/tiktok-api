const { User, Post, Follow, BlockedUser, Sequelize } = require("../models");
const notificationService = require('./notification.service');

const isBlocked = async (userId1, userId2) => {
  const block = await BlockedUser.findOne({
    where: {
      [require('sequelize').Op.or]: [
        { blockerId: userId1, blockedId: userId2 },
        { blockerId: userId2, blockedId: userId1 },
      ],
    },
  });
  return block;
};

exports.followUser = async (followerId, followingId) => {
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
    });
  } else {
    newFollow.dataValues.isFriend = false; // Đảm bảo trường isFriend: false luôn có trong response
    // Nếu không phải là bạn bè, chỉ gửi thông báo "new_follower"
    await notificationService.createNotification({
      recipientId: followingId,
      senderId: followerId,
      type: 'new_follower',
      entityId: followerId
    });
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
    attributes: ['id', 'username', 'avatar', 'bio'] // Chỉ trả về các trường công khai
  });
};

exports.getUserById = async (userId) => {
  // Logic kiểm tra block đã được chuyển hoàn toàn sang middleware `checkBlock`.
  // Hàm này giờ chỉ có nhiệm vụ lấy thông tin user.
  return await User.findByPk(userId, {
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
