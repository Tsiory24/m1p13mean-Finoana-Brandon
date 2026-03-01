const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { upload, uploadsDir } = require('../middlewares/upload');
const { protect } = require('../middlewares/auth');

// Multer error handler — returns JSON instead of HTML
function handleUpload(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}

// POST /api/upload → compress with sharp, save as WebP, return { url, filename }
router.post('/', protect, handleUpload, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Aucun fichier fourni' });
  }

  try {
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}.webp`;
    const outputPath = path.join(uploadsDir, filename);

    // Compress losslessly to WebP — zero quality loss, smaller file size
    await sharp(req.file.buffer)
      .webp({ lossless: true, effort: 6 })
      .toFile(outputPath);

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const url = `${baseUrl}/uploads/${filename}`;

    res.status(201).json({ success: true, url, filename });
  } catch (err) {
    res.status(500).json({ success: false, message: "Erreur lors du traitement de l'image", error: err.message });
  }
});

// DELETE /api/upload → delete uploaded file by filename
router.delete('/', protect, (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ success: false, message: 'Nom de fichier manquant' });

  const filePath = path.join(uploadsDir, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  res.json({ success: true });
});

module.exports = router;
