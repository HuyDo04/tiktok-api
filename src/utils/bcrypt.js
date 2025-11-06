const bcrypt = require("bcrypt")
const saltRounds = 10 //
// Hàm hash dùng để: Mã hóa mật khẩu người dùng để lưu vào database
// Output: Chuỗi hash(đã mã hóa) không thể giải ngược về. Chỉ có thể so sánh

// Tạo hàm hash. Tham số đầu vào là planinPassword (Mật khẩu người dùng nhập)
exports.hash = async (plainPassword) => {
    return await bcrypt.hash(plainPassword, saltRounds);
}


// Hàm compare dùng để: So sánh mật khẩu người dùng với mật khẩu đã lưu trong database(đã được hash)
// Output: true-> Mật khẩu đúng, false -> Mật khẩu sai
exports.compare = async (userPassword, storedPassword) => {    
    return await bcrypt.compare(userPassword, storedPassword);
}
