import prisma from '../config/database.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { successResponse, errorResponse } from '../utils/responseFormatter.js';
import { uploadToCloudinary, deleteFromCloudinary, generateImageVersions } from '../utils/cloudinary.js';

/**
 * @desc    Get single photo by ID
 * @route   GET /api/photos/:id
 * @access  Public (if album published) / Private (if authenticated)
 */
export const getPhotoById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const photo = await prisma.photo.findUnique({
      where: { id: parseInt(id) },
      include: {
        album: {
          select: {
            id: true,
            title: true,
            isPublished: true,
            createdById: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });

    if (!photo) {
      return errorResponse(res, 404, 'Photo not found');
    }

    // Check if album is published - if not, only allow access to creator or admin
    if (!photo.album.isPublished && (!req.user || (req.user.id !== photo.album.createdById && req.user.role !== 'ADMIN'))) {
      return errorResponse(res, 403, 'Access denied. This photo belongs to an unpublished album.');
    }

    // Generate different image versions
    const imageVersions = photo.cloudinaryId ? generateImageVersions(photo.cloudinaryId) : {};

    const photoWithVersions = {
      ...photo,
      imageVersions,
    };

    return successResponse(
      res,
      200,
      'Photo retrieved successfully',
      { photo: photoWithVersions }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload single photo to album
 * @route   POST /api/albums/:id/photos
 * @access  Private (Album owner or Admin)
 */
export const uploadPhoto = async (req, res, next) => {
  try {
    const { id: albumId } = req.params;
    const userId = req.user.id;

    if (!req.file) {
      return errorResponse(res, 400, 'No file uploaded');
    }

    // Check if album exists and user has permission
    const album = await prisma.album.findUnique({
      where: { id: parseInt(albumId) },
    });

    if (!album) {
      return errorResponse(res, 404, 'Album not found');
    }

    // Check if user has permission (album owner or admin)
    if (album.createdById !== userId && req.user.role !== 'ADMIN') {
      return errorResponse(res, 403, 'Access denied. You can only upload photos to your own albums.');
    }

    // Get the next sort order for this album
    const lastPhoto = await prisma.photo.findFirst({
      where: { albumId: parseInt(albumId) },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const nextSortOrder = lastPhoto ? lastPhoto.sortOrder + 1 : 0;

    // Create photo record in database
    const photo = await prisma.photo.create({
      data: {
        albumId: parseInt(albumId),
        uploadedById: userId,
        photoUrl: req.file.path,
        cloudinaryId: req.file.filename, // Cloudinary public_id
        filename: req.file.originalname,
        fileSize: req.file.size,
        sortOrder: nextSortOrder,
      },
      include: {
        album: {
          select: {
            id: true,
            title: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });

    // Generate image versions
    const imageVersions = generateImageVersions(req.file.filename);

    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      action: 'UPLOAD_PHOTO',
      tableName: 'photos',
      recordId: photo.id,
      newValues: {
        albumId: photo.albumId,
        filename: photo.filename,
        fileSize: photo.fileSize,
      },
      ipAddress: req.ip,
    });

    const photoWithVersions = {
      ...photo,
      imageVersions,
    };

    return successResponse(
      res,
      201,
      'Photo uploaded successfully',
      { photo: photoWithVersions }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk upload multiple photos to album
 * @route   POST /api/photos/bulk-upload
 * @access  Private (Album owner or Admin)
 */
export const bulkUploadPhotos = async (req, res, next) => {
  try {
    const { albumId } = req.body;
    const userId = req.user.id;

    if (!req.files || req.files.length === 0) {
      return errorResponse(res, 400, 'No files uploaded');
    }

    // Check if album exists and user has permission
    const album = await prisma.album.findUnique({
      where: { id: parseInt(albumId) },
    });

    if (!album) {
      return errorResponse(res, 404, 'Album not found');
    }

    // Check if user has permission (album owner or admin)
    if (album.createdById !== userId && req.user.role !== 'ADMIN') {
      return errorResponse(res, 403, 'Access denied. You can only upload photos to your own albums.');
    }

    // Get the current max sort order for this album
    const lastPhoto = await prisma.photo.findFirst({
      where: { albumId: parseInt(albumId) },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    let currentSortOrder = lastPhoto ? lastPhoto.sortOrder + 1 : 0;

    // Process all uploaded files
    const uploadPromises = req.files.map((file, index) => {
      return prisma.photo.create({
        data: {
          albumId: parseInt(albumId),
          uploadedById: userId,
          photoUrl: file.path,
          cloudinaryId: file.filename,
          filename: file.originalname,
          fileSize: file.size,
          sortOrder: currentSortOrder + index,
        },
        include: {
          album: {
            select: {
              id: true,
              title: true,
            },
          },
          uploadedBy: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
        },
      });
    });

    const uploadedPhotos = await prisma.$transaction(uploadPromises);

    // Generate image versions for each photo
    const photosWithVersions = uploadedPhotos.map(photo => ({
      ...photo,
      imageVersions: generateImageVersions(photo.cloudinaryId),
    }));

    // Create audit log for bulk upload
    await createAuditLog({
      userId: req.user.id,
      action: 'BULK_UPLOAD_PHOTOS',
      tableName: 'photos',
      recordId: null,
      newValues: {
        albumId: parseInt(albumId),
        photoCount: uploadedPhotos.length,
        filenames: uploadedPhotos.map(p => p.filename),
      },
      ipAddress: req.ip,
    });

    return successResponse(
      res,
      201,
      `${uploadedPhotos.length} photos uploaded successfully`,
      { photos: photosWithVersions }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update photo details
 * @route   PUT /api/photos/:id
 * @access  Private (Photo owner or Admin)
 */
export const updatePhoto = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user.id;

    // Check if photo exists
    const existingPhoto = await prisma.photo.findUnique({
      where: { id: parseInt(id) },
      include: {
        album: {
          select: {
            createdById: true,
          },
        },
      },
    });

    if (!existingPhoto) {
      return errorResponse(res, 404, 'Photo not found');
    }

    // Check if user has permission (album owner or admin)
    if (existingPhoto.album.createdById !== userId && req.user.role !== 'ADMIN') {
      return errorResponse(res, 403, 'Access denied. You can only update photos in your own albums.');
    }

    const oldValues = {
      filename: existingPhoto.filename,
      sortOrder: existingPhoto.sortOrder,
    };

    const photo = await prisma.photo.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        album: {
          select: {
            id: true,
            title: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      action: 'UPDATE_PHOTO',
      tableName: 'photos',
      recordId: photo.id,
      oldValues,
      newValues: updateData,
      ipAddress: req.ip,
    });

    return successResponse(
      res,
      200,
      'Photo updated successfully',
      { photo }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete photo
 * @route   DELETE /api/photos/:id
 * @access  Private (Photo owner or Admin)
 */
export const deletePhoto = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if photo exists
    const existingPhoto = await prisma.photo.findUnique({
      where: { id: parseInt(id) },
      include: {
        album: {
          select: {
            createdById: true,
          },
        },
      },
    });

    if (!existingPhoto) {
      return errorResponse(res, 404, 'Photo not found');
    }

    // Check if user has permission (album owner or admin)
    if (existingPhoto.album.createdById !== userId && req.user.role !== 'ADMIN') {
      return errorResponse(res, 403, 'Access denied. You can only delete photos from your own albums.');
    }

    const oldValues = { ...existingPhoto };

    // Delete from Cloudinary first
    if (existingPhoto.cloudinaryId) {
      try {
        await deleteFromCloudinary(existingPhoto.cloudinaryId);
        console.log(`✅ Photo deleted from Cloudinary: ${existingPhoto.cloudinaryId}`);
      } catch (cloudinaryError) {
        console.error('❌ Failed to delete from Cloudinary:', cloudinaryError);
        // Continue with database deletion even if Cloudinary fails
      }
    }

    // Delete from database
    await prisma.photo.delete({
      where: { id: parseInt(id) },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      action: 'DELETE_PHOTO',
      tableName: 'photos',
      recordId: parseInt(id),
      oldValues,
      ipAddress: req.ip,
    });

    return successResponse(res, 200, 'Photo deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reorder photo in album
 * @route   PUT /api/photos/:id/reorder
 * @access  Private (Photo owner or Admin)
 */
export const reorderPhoto = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sortOrder } = req.body;
    const userId = req.user.id;

    // Check if photo exists
    const existingPhoto = await prisma.photo.findUnique({
      where: { id: parseInt(id) },
      include: {
        album: {
          select: {
            createdById: true,
          },
        },
      },
    });

    if (!existingPhoto) {
      return errorResponse(res, 404, 'Photo not found');
    }

    // Check if user has permission (album owner or admin)
    if (existingPhoto.album.createdById !== userId && req.user.role !== 'ADMIN') {
      return errorResponse(res, 403, 'Access denied. You can only reorder photos in your own albums.');
    }

    const oldValues = { sortOrder: existingPhoto.sortOrder };

    // Update the photo's sort order
    const photo = await prisma.photo.update({
      where: { id: parseInt(id) },
      data: { sortOrder },
      include: {
        album: {
          select: {
            id: true,
            title: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      action: 'REORDER_PHOTO',
      tableName: 'photos',
      recordId: photo.id,
      oldValues,
      newValues: { sortOrder },
      ipAddress: req.ip,
    });

    return successResponse(
      res,
      200,
      'Photo reordered successfully',
      { photo }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reorder multiple photos in album (batch operation)
 * @route   PUT /api/photos/reorder-batch
 * @access  Private (Album owner or Admin)
 */
export const reorderPhotosBatch = async (req, res, next) => {
  try {
    const { albumId, photoOrders } = req.body;
    const userId = req.user.id;

    // Check if album exists and user has permission
    const album = await prisma.album.findUnique({
      where: { id: parseInt(albumId) },
    });

    if (!album) {
      return errorResponse(res, 404, 'Album not found');
    }

    // Check if user has permission (album owner or admin)
    if (album.createdById !== userId && req.user.role !== 'ADMIN') {
      return errorResponse(res, 403, 'Access denied. You can only reorder photos in your own albums.');
    }

    // Validate photoOrders array
    if (!Array.isArray(photoOrders) || photoOrders.length === 0) {
      return errorResponse(res, 400, 'photoOrders must be a non-empty array');
    }

    // Update all photos in a transaction
    const updatePromises = photoOrders.map(({ photoId, sortOrder }) =>
      prisma.photo.updateMany({
        where: {
          id: photoId,
          albumId: parseInt(albumId), // Ensure photo belongs to the album
        },
        data: { sortOrder },
      })
    );

    await prisma.$transaction(updatePromises);

    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      action: 'REORDER_PHOTOS_BATCH',
      tableName: 'photos',
      recordId: null,
      newValues: {
        albumId: parseInt(albumId),
        photoOrders,
      },
      ipAddress: req.ip,
    });

    return successResponse(
      res,
      200,
      `${photoOrders.length} photos reordered successfully`
    );
  } catch (error) {
    next(error);
  }
};