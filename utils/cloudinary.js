import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/environment.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

/**
 * Upload file to Cloudinary
 * @param {string} filePath - Path to the file
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
export const uploadToCloudinary = async (filePath, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'photography-studio',
      ...options,
    });
    return result;
  } catch (error) {
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Public ID of the file
 * @returns {Promise<Object>} Delete result
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    throw new Error(`Cloudinary delete failed: ${error.message}`);
  }
};

/**
 * Generate multiple image versions (thumbnails, etc.)
 * @param {string} publicId - Public ID of the original image
 * @returns {Object} URLs for different versions
 */
export const generateImageVersions = (publicId) => {
  return {
    original: cloudinary.url(publicId),
    large: cloudinary.url(publicId, {
      width: 1200,
      height: 800,
      crop: 'limit',
      quality: 'auto',
    }),
    medium: cloudinary.url(publicId, {
      width: 800,
      height: 600,
      crop: 'limit',
      quality: 'auto',
    }),
    thumbnail: cloudinary.url(publicId, {
      width: 300,
      height: 200,
      crop: 'fill',
      quality: 'auto',
    }),
  };
};

export default cloudinary;