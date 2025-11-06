const userService = require("@/service/user.service");
const authService = require("@/service/auth.service");

// Search users
exports.searchUsers = async (req, res) => {
    try {
      const currentUserId = req.user ? req.user.id : null;
      const { q } = req.query; // Lấy query tìm kiếm, ví dụ: /api/users?q=huy

      const users = await userService.getAllUser(currentUserId, q);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Lỗi khi tìm kiếm người dùng", error: error.message });
    }
};

// Get user by ID 
exports.getUserById = async (req, res) => {
    try {
        // Middleware checkBlock đã xử lý việc chặn.
        // Nếu request đến được đây, nghĩa là không có block.
        const user = await userService.getUserById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: "Người dùng không tồn tại." });
        }
        res.json(user);
    } catch (error) {
        console.error("Lỗi lấy chi tiết người dùng:", error);
        res.status(500).json({ message: "Lỗi máy chủ khi lấy chi tiết người dùng." });
    }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const userIdToUpdate = req.params.id;
    const currentUserId = req.user.id;

    // Chỉ cho phép người dùng tự cập nhật thông tin của chính họ
    if (parseInt(userIdToUpdate, 10) !== currentUserId) {
      return res.status(403).json({ message: "Bạn không có quyền thực hiện hành động này." });
    }

    // Chỉ lấy các trường được phép cập nhật từ body
    const { username, bio } = req.body;
    const userDataToUpdate = {};
    if (username !== undefined) userDataToUpdate.username = username;
    if (bio !== undefined) userDataToUpdate.bio = bio;

    const updatedUser = await userService.updateUser(userIdToUpdate, userDataToUpdate);
    if (!updatedUser) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // Sử dụng authService.getSafeUser để trả về dữ liệu an toàn
    const safeUser = await authService.getSafeUser(updatedUser.id);
    res.json({ message: "Cập nhật người dùng thành công", user: safeUser });
  } catch (error) {
    res.status(500).json({ message: "Lỗi cập nhật người dùng", error: error.message });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
    try {
        const result = await userService.deleteUser(req.params.id);
        if (!result) {
            return res.status(404).json({ message: "Người dùng không tồn tại" });
        }
        res.json({ message: "Xóa người dùng thành công" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi xóa người dùng", error });
    }
};

exports.updateAvatar = async (req, res) => {
  try {
    const userId = req.user.id;
    if (req.sameAvatar) {
      return res.json({
        message: "Avatar đã giống với ảnh hiện tại, không cần cập nhật.",
        avatar: req.user.avatar, // Return current avatar path
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng chọn ảnh để upload" });
    }

    const avatarPath = `/uploads/avatars/${req.file.filename}`;
    const user = await userService.updateAvatar(userId, avatarPath);

    res.json({
      message: "Cập nhật avatar thành công",
      avatar: user.avatar,
    });
  } catch (error) {
    console.error("Lỗi cập nhật avatar:", error);
    if (error.message === "User not found") {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.getUserPosts = async (req, res) => {
  try {
    // Giả định có middleware xác thực tùy chọn để lấy req.user
    const currentUserId = req.user ? req.user.id : null;
    const targetUserId = req.params.id;

    const posts = await userService.getUserPosts(targetUserId, currentUserId);
    res.json(posts);
  } catch (error) {
    console.error("Lỗi lấy bài viết của người dùng:", error);
    if (error.message === "User not found") {
      return res.status(404).json({ message: "Người dùng không tồn tại." });
    }
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.checkUsername = async (req, res) => {
    try {
        const { username } = req.query;
        if (!username) {
            return res.status(400).json({ message: "Username is required" });
        }
        const exists = await userService.checkUsernameExists(username);
        res.json({ exists });
    } catch (error) {
        console.error("Error checking username existence:", error);
        res.status(500).json({ message: "Error checking username existence", error });
    }
};

exports.follow = async (req, res) => {
  try {
    const followerId = req.user.id;
    const followingId = req.params.id;
    const result = await userService.followUser(followerId, followingId);
    res.status(201).json({ message: "Theo dõi người dùng thành công.", result });
  } catch (error) {
    if (error.message === 'Không thể thực hiện hành động này do bị chặn.') {
        return res.status(403).json({ message: error.message });
    }
    if (error.message === 'Bạn đã theo dõi người dùng này rồi.') {
        return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Lỗi khi theo dõi người dùng.", error: error.message });
  }
};

exports.unfollow = async (req, res) => {
  try {
    const followerId = req.user.id;
    const followingId = req.params.id;
    const result = await userService.unfollowUser(followerId, followingId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi bỏ theo dõi người dùng.", error: error.message });
  }
};

exports.block = async (req, res) => {
  try {
    const blockerId = req.user.id;
    const blockedId = req.params.id;
    const result = await userService.blockUser(blockerId, blockedId);
    res.status(201).json({ message: "Đã chặn người dùng thành công.", result });
  } catch (error) {
    if (error.message === 'You cannot block yourself') {
        return res.status(400).json({ message: "Không thể tự chặn chính mình." });
    }
    res.status(500).json({ message: "Lỗi khi chặn người dùng.", error: error.message });
  }
};

exports.unblock = async (req, res) => {
  try {
    const blockerId = req.user.id;
    const blockedId = req.params.id;
    const result = await userService.unblockUser(blockerId, blockedId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi bỏ chặn người dùng.", error: error.message });
  }
};

exports.getFollowers = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user ? req.user.id : null;
    const user = await userService.getFollowers(targetUserId, currentUserId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.Followers);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách người theo dõi.", error: error.message });
  }
};

exports.getFollowing = async (req, res) => {
  try {
    const userId = req.params.id;
    // Logic lọc block tương tự getFollowers có thể được thêm vào getFollowing nếu cần
    // Hiện tại giữ nguyên để đơn giản
    const user = await userService.getFollowing(userId); 
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.Following);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách đang theo dõi.", error: error.message });
  }
};

exports.getBlockedUsers = async (req, res) => {
  try {
    const userId = req.user.id; // Only the user can see their own blocked list
    const user = await userService.getBlockedUsers(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.BlockedUsers);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách người dùng bị chặn.", error: error.message });
  }
};

exports.getFriends = async (req, res) => {
  try {
    const userId = req.user.id; // Chỉ lấy danh sách bạn bè của chính mình
    const friends = await userService.getFriends(userId);
    res.json(friends);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách bạn bè.", error: error.message });
  }
};