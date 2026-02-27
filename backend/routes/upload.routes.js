const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const upload = require('../middlewares/upload');
const { protect } = require('../middlewares/auth');

// POST /api/upload  → upload one image, returns { url }
router.post('/', protect, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Aucun fichier fourni' });
  }

  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
  const url = `${baseUrl}/uploads/${req.file.filename}`;

  res.status(201).json({ success: true, data: { url } });
});

// DELETE /api/upload  → delete an uploaded file by filename
router.delete('/', protect, (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ success: false, message: 'Nom de fichier manquant' });

  const filePath = path.join(__dirname, '..', 'public', 'uploads', filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  res.json({ success: true });
});

module.exports = router;
