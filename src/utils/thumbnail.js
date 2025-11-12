const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const { path: ffprobePath } = require("ffprobe-static");
const path = require("path");
const fs = require("fs");

// Set paths for ffmpeg and ffprobe
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

/**
 * Generates a thumbnail for a video file.
 * @param {string} videoPath - The full path to the video file.
 * @returns {Promise<string>} A promise that resolves with the path to the generated thumbnail.
 */
const generateThumbnail = (videoPath) => {
  return new Promise((resolve, reject) => {
    const thumbnailDir = path.join("public", "uploads", "thumbnails");
    const videoFilename = path.basename(videoPath, path.extname(videoPath));
    const thumbnailFilename = `${videoFilename}-thumb.png`;
    const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);

    // Đảm bảo thư mục thumbnails tồn tại
    fs.mkdirSync(thumbnailDir, { recursive: true });

    ffmpeg(videoPath)
      .on("end", () => {
        console.log(`Thumbnail generated for ${videoPath}`);
        // Trả về đường dẫn tương đối để lưu vào DB
        resolve(path.join("uploads", "thumbnails", thumbnailFilename).replace(/\\/g, "/"));
      })
      .on("error", (err) => {
        console.error(`Error generating thumbnail for ${videoPath}:`, err);
        reject(err);
      })
      .screenshots({
        count: 1,
        folder: thumbnailDir,
        filename: thumbnailFilename,
        timemarks: ["4"], // Lấy frame ở giây thứ 4
      });
  });
};

module.exports = { generateThumbnail };
