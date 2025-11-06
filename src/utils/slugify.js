// utils/slugify.js
function slugify(str) {
    return str
      .toLowerCase()
      .replace(/đ/g, "d") // Chuyển chữ đ thành d
      .normalize("NFD") // tách dấu
      .replace(/[\u0300-\u036f]/g, "") // xóa dấu
      .replace(/[^a-z0-9\s-]/g, "") // bỏ ký tự đặc biệt
      .trim()
      .replace(/\s+/g, "-"); // đổi khoảng trắng thành gạch ngang
  }
  
  module.exports = { slugify };
  