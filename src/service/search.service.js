const userService = require('./user.service');
const postService = require('./post.service');
const searchHistoryService = require('./searchHistory.service');
const removeAccents = require('remove-accents');


exports.searchAll = async (query, currentUserId) => {
  if (!query) {
    return {
      users: [],
      posts: [],
    };
  }

  // Nếu có người dùng đăng nhập, lưu lại lịch sử tìm kiếm
  if (currentUserId) {
    await searchHistoryService.addSearchHistory(currentUserId, query);
  }

  // 1. Tìm kiếm người dùng theo username
  const users = await userService.getAllUser(currentUserId, query);

  // Lấy tất cả bài viết từ những người dùng tìm được
  let postsFromFoundUsers = [];
  if (users.length > 0) {
    const userPostPromises = users.map(user =>
      postService.getVisiblePostsForUser(user.id, currentUserId)
    );
    postsFromFoundUsers = (await Promise.all(userPostPromises)).flat();
  }

  let postsByHashtag = [];
  let postsByMention = [];

  // 2. Phân loại tìm kiếm bài đăng
  if (query.startsWith('@')) {
    // Tìm kiếm bài đăng theo mention
    const username = query.substring(1);
    postsByMention = await postService.getPostsByMentionedUser(username, currentUserId);
  } else {
    // Tìm kiếm bài đăng (video) theo hashtag
    postsByHashtag = await postService.getPostsByHashtag(query, currentUserId);
  }

  // 4. Tìm kiếm bài đăng (video) theo content
  const postsByContent = await postService.getPostsByContent(query, currentUserId);

  // 5. Tổng hợp kết quả và loại bỏ trùng lặp
  const allPosts = [...postsFromFoundUsers, ...postsByHashtag, ...postsByMention, ...postsByContent];
  const uniquePosts = allPosts.reduce((acc, current) => {
    if (!acc.find(item => item.id === current.id)) {
      acc.push(current);
    }
    return acc;
  }, []);

  return {
    users: users,
    posts: uniquePosts,
  };
};