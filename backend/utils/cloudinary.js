const cloudinary = require('cloudinary').v2;

// Configure via CLOUDINARY_URL env variable (format: cloudinary://api_key:api_secret@cloud_name)
cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL });

/**
 * Upload a buffer to Cloudinary.
 * @param {Buffer} buffer - Image buffer to upload
 * @param {object} options - Cloudinary upload options
 * @returns {Promise<object>} Cloudinary upload result
 */
function uploadBuffer(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const defaultOptions = { folder: 'mall', resource_type: 'image' };
    const stream = cloudinary.uploader.upload_stream(
      { ...defaultOptions, ...options },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

/**
 * Upload a file from local path to Cloudinary.
 * @param {string} filePath - Absolute path to the file
 * @param {object} options - Cloudinary upload options
 * @returns {Promise<object>} Cloudinary upload result
 */
function uploadFile(filePath, options = {}) {
  const defaultOptions = { folder: 'mall', resource_type: 'image' };
  return cloudinary.uploader.upload(filePath, { ...defaultOptions, ...options });
}

/**
 * Delete an asset from Cloudinary by its public_id.
 * @param {string} publicId - Cloudinary public_id of the asset
 * @returns {Promise<object>} Cloudinary deletion result
 */
function deleteAsset(publicId) {
  return cloudinary.uploader.destroy(publicId);
}

module.exports = { cloudinary, uploadBuffer, uploadFile, deleteAsset };
