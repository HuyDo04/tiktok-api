# Tiktok-API

Backend cho Ứng dụng Mạng Xã hội (Inspired by TikTok)

Dự án này xây dựng hệ thống backend cho một ứng dụng mạng xã hội dạng video ngắn tương tự TikTok. Hệ thống sử dụng **Node.js**, **Express**, **Sequelize** và hỗ trợ thời gian thực thông qua **Socket.IO**.

Mục tiêu là tạo ra một backend mạnh mẽ, bảo mật, dễ mở rộng và có thể tích hợp cho web-app hoặc mobile-app.

---

## Tính năng chính

### 1. Hệ thống Người dùng & Xác thực

- Xác thực bằng **JWT**
- Đăng ký, đăng nhập, đổi mật khẩu, quên mật khẩu
- Quản lý hồ sơ cá nhân (username, bio, avatar)
- Kiểm tra email / username / phone trùng:
  - `/auth/check-email`
  - `/auth/check-phone`
  - `/auth/check-username`
- Quan hệ xã hội:
  - Follow / Unfollow
  - Kết bạn (khi follow lẫn nhau)
  - Block / Unblock user
- Lấy thông tin user bằng ID hoặc username

---

### 2. Hệ thống Bài viết (Posts)

- Tạo bài viết với:
  - **Video** (tự convert sang `.mp4` + tạo thumbnail)
  - **Nhiều hình ảnh**
- Nội dung hỗ trợ:
  - Caption
  - Tags `#`
  - Mentions `@username`
- Quyền riêng tư:
  - Public / Friends / Private
- Tương tác:
  - Like / Unlike bài viết
  - Repost / Unrepost
  - Tăng lượt xem (auto view count)
- Feed cá nhân hóa:
  - Ưu tiên bài của bạn bè → following → trending
  - Hỗ trợ phân trang (pagination)

---

### 3. Chat thời gian thực (Real-time Chat)

- Sử dụng **Socket.IO**
- Chat 1-1
- Tính năng:
  - Gửi tin nhắn theo thời gian thực
  - Seen message
  - Đếm tin nhắn chưa đọc
  - Trạng thái online/offline

---

### 4. 🔔 Thông báo (Notifications)

- Real-time notification qua Socket.IO cho:
  - Follow
  - Becoming friends
  - Like post
  - Repost
  - Mention trong bài viết
- API quản lý thông báo:
  - Lấy danh sách
  - Đánh dấu đã đọc / tất cả đã đọc

---

## Công nghệ sử dụng

- Node.js / Express.js
- Sequelize ORM
- Socket.IO (Real-time)
- JWT Authentication
- Multer (Upload)
- Fluent-ffmpeg (Xử lý video)
- bcrypt (Hash password)

## 🚀 Hướng dẫn cài đặt & chạy dự án

### 1. Clone project

git https://github.com/HuyDo04/tiktok-api

### 2. Cài đặt dependencies

npm install

### 3. Tạo database

CREATE DATABASE tiktok CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

### 4. Chạy migrate

npx sequelize db:migrate

### 5. Chạy server

npm run dev
