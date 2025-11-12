const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");

// --- Storage ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = file.mimetype.startsWith("video/")
      ? "public/uploads/videos"
      : "public/uploads/posts";
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

// --- File filter ---
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ hỗ trợ file ảnh và video!"), false);
  }
};

// --- Multer upload ---
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

// --- Convert video sang MP4 và xóa file gốc ---
const convertVideoToMp4 = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".mp4") return Promise.resolve(filePath); // đã là mp4

  const outputFile = filePath.replace(ext, ".mp4");

  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .outputOptions(["-c:v libx264", "-c:a aac", "-movflags +faststart"])
      .save(outputFile)
      .on("end", () => {
        // Xóa file gốc
        fs.unlink(filePath, (err) => {
          if (err) console.error("Xóa file gốc lỗi:", err);
        });
        resolve(outputFile);
      })
      .on("error", (err) => reject(err));
  });
};

// --- Middleware upload + convert ---
const uploadPostFields = () => async (req, res, next) => {
  const fields = [
    { name: "video", maxCount: 1 },
    { name: "images", maxCount: 10 },
  ];

  upload.fields(fields)(req, res, async (err) => {
    if (err) {
      console.error("Multer error details:", err); // Thêm log chi tiết lỗi
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE")
          return res.status(400).json({ message: "File quá lớn. Tối đa 500MB" });
        if (err.code === "LIMIT_UNEXPECTED_FILE")
          return res.status(400).json({ message: "Quá số lượng file cho phép" });
      }
      return res.status(400).json({ message: err.message });
    }

    // Logic kiểm tra: Chỉ cho phép video HOẶC ảnh, không cho phép cả hai
    const hasVideo = req.files && req.files.video && req.files.video.length > 0;
    const hasImages = req.files && req.files.images && req.files.images.length > 0;

    if (hasVideo && hasImages) {
      // Nếu người dùng tải lên cả video và ảnh, xóa các file đã tải lên và báo lỗi
      const filesToDelete = [...(req.files.video || []), ...(req.files.images || [])];
      filesToDelete.forEach(file => {
        fs.unlink(file.path, err => {
          if (err) console.error(`Lỗi khi xóa file ${file.path}:`, err);
        });
      });

      return res.status(400).json({
        message: "Không thể đăng đồng thời cả video và ảnh. Vui lòng chỉ chọn một loại."
      });
    }

    try {
      // Convert video nếu có
      if (req.files && req.files.video && req.files.video.length > 0) {
        const videoFile = req.files.video[0];
        videoFile.path = await convertVideoToMp4(videoFile.path);
        videoFile.filename = path.basename(videoFile.path);
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Lỗi convert video!" });
    }
  });
};

module.exports = uploadPostFields;
