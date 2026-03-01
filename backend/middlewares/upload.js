const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Use memory storage so sharp can process the buffer before saving
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExt = /\.(jpeg|jpg|png|gif|webp)$/i;
  const allowedMime = /^image\/(jpeg|jpg|png|gif|webp|octet-stream)$/i;
  const extOk = allowedExt.test(path.extname(file.originalname));
  const mimeOk = allowedMime.test(file.mimetype) || file.mimetype === 'application/octet-stream';
  if (extOk || mimeOk) {
    cb(null, true);
  } else {
    cb(new Error('Seules les images (jpg, png, gif, webp) sont acceptées'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB input limit (sharp will compress down)
  fileFilter
});

module.exports = { upload, uploadsDir };
