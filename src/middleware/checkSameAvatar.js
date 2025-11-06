const fs = require('fs');
const crypto = require('crypto');
const userService = require('../service/user.service');
const path = require('path');

const calculateFileHash = (filePath) => {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', (err) => reject(err));
    });
};

const checkSameAvatar = async (req, res, next) => {
    if (!req.file) {
        console.log("No file uploaded, proceeding.");
        return next(); // No file uploaded, proceed
    }

    try {
        const userId = req.user.id;
        const user = await userService.getUserById(userId);

        if (!user) {
            console.log("User not found for ID:", userId);
            // User not found, this should ideally be handled by auth middleware
            return res.status(404).json({ message: "Người dùng không tồn tại" });
        }

        const newFilePath = req.file.path;
        const currentAvatarPath = user.avatar ? path.join(__dirname, '../../public', user.avatar) : null;

        

        if (currentAvatarPath && fs.existsSync(currentAvatarPath)) {
            const newFileHash = await calculateFileHash(newFilePath);
            const currentAvatarHash = await calculateFileHash(currentAvatarPath);

           

            if (newFileHash === currentAvatarHash) {
                
                // Files are identical, delete the newly uploaded file
                fs.unlink(newFilePath, (err) => {
                    if (err) console.error("Error deleting duplicate avatar file:", err);
                });
                req.sameAvatar = true; // Set flag
            } else {
                console.log("Hashes do NOT match.");
            }
        } else {
            console.log("No current avatar or file does not exist.");
        }
        next();
    } catch (error) {
        console.error("Error in checkSameAvatar middleware:", error);
        res.status(500).json({ message: "Lỗi server khi kiểm tra avatar" });
    }
};

module.exports = checkSameAvatar;
