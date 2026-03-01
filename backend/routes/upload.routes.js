const express = require('express');
const router = express.Router();
const sharp = require('sharp');
const { upload } = require('../middlewares/upload');
const { protect } = require('../middlewares/auth');
const { uploadBuffer, deleteAsset } = require('../utils/cloudinary');

// Multer error handler — returns JSON instead of HTML
function handleUpload(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}

// POST /api/upload → compress with sharp, upload to Cloudinary, return { url, filename }
// `filename` contient le public_id Cloudinary (utilisé pour la suppression)
router.post('/', protect, handleUpload, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Aucun fichier fourni' });
  }

  try {
    // Convert to WebP lossless before uploading
    const webpBuffer = await sharp(req.file.buffer)
      .webp({ lossless: true, effort: 6 })
      .toBuffer();

    const result = await uploadBuffer(webpBuffer, {
      folder: 'mall',
      format: 'webp',
    });

    res.status(201).json({
      success: true,
      url: result.secure_url,
      filename: result.public_id,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Erreur lors du téléchargement de l'image",
      error: err.message,
    });
  }
});

// DELETE /api/upload → delete asset from Cloudinary by public_id (passed as `filename`)
router.delete('/', protect, async (req, res) => {
  const { filename } = req.body;
  if (!filename) {
    return res.status(400).json({ success: false, message: 'public_id manquant' });
  }

  try {
    await deleteAsset(filename);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression',
      error: err.message,
    });
  }
});

module.exports = router;
