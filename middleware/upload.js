import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../utils/cloudinary.js';
import { config } from '../config/environment.js';

// Cloudinary storage configuration for photos
const photoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'photography-studio/photos',
    format: async (req, file) => {
      const format = file.mimetype.split('/')[1];
      return ['jpg', 'jpeg', 'png', 'webp'].includes(format) ? format : 'jpg';
    },
    public_id: (req, file) => {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const albumId = req.params.id || 'general';
      return `photo-${albumId}-${timestamp}-${randomString}`;
    },
    transformation: [
      { width: 1920, height: 1080, crop: 'limit', quality: 'auto' }, // Main image
    ],
  },
});

// File filter for photos
const photoFileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

// Configure multer for photos
export const uploadSingle = multer({
  storage: photoStorage,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
  fileFilter: photoFileFilter,
}).single('photo');

export const uploadMultiple = (fieldName, maxCount = 10) => {
  return multer({
    storage: photoStorage,
    limits: {
      fileSize: config.upload.maxFileSize,
    },
    fileFilter: photoFileFilter,
  }).array(fieldName, maxCount);
};

// Error handling middleware for multer
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${config.upload.maxFileSize / 1024 / 1024}MB.`,
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files.',
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field.',
      });
    }
  }
  
  if (err.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next(err);
};