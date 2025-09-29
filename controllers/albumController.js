import prisma from '../config/database.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/responseFormatter.js';

/**
 * @desc    Get all albums with pagination and filtering
 * @route   GET /api/albums
 * @access  Public (published albums) / Private (all albums for authenticated users)
 */
export const getAllAlbums = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      isPublished,
      createdBy,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includePhotos = false,
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause - show only published albums for public, all for authenticated
    const where = {
      AND: [
        // For public access, only show published albums
        !req.user ? { isPublished: true } : {},
        // For authenticated users, allow filtering by published status
        isPublished !== undefined ? { isPublished: isPublished === 'true' } : {},
        search ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        } : {},
        createdBy ? { createdById: parseInt(createdBy) } : {},
      ],
    };

    // Include photos if requested
    const include = includePhotos === 'true' ? {
      photos: {
        select: {
          id: true,
          photoUrl: true,
          filename: true,
          sortOrder: true,
          uploadedAt: true,
        },
        orderBy: { sortOrder: 'asc' },
        take: 5, // Limit photos in list view
      },
    } : {};

    // Get albums with pagination
    const [albums, total] = await Promise.all([
      prisma.album.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
          ...include,
          _count: {
            select: {
              photos: true,
            },
          },
        },
      }),
      prisma.album.count({ where }),
    ]);

    // Format response data
    const albumsWithStats = albums.map(album => ({
      ...album,
      photoCount: album._count.photos,
      _count: undefined,
    }));

    return paginatedResponse(
      res,
      albumsWithStats,
      pageNum,
      limitNum,
      total,
      'Albums retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single album by ID
 * @route   GET /api/albums/:id
 * @access  Public (if published) / Private (if authenticated)
 */
export const getAlbumById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const album = await prisma.album.findUnique({
      where: { id: parseInt(id) },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        photos: {
          select: {
            id: true,
            photoUrl: true,
            cloudinaryId: true,
            filename: true,
            fileSize: true,
            sortOrder: true,
            uploadedAt: true,
            uploadedBy: {
              select: {
                id: true,
                username: true,
                fullName: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: {
            photos: true,
          },
        },
      },
    });

    if (!album) {
      return errorResponse(res, 404, 'Album not found');
    }

    // Check if album is published - if not, only allow access to creator or admin
    if (!album.isPublished && (!req.user || (req.user.id !== album.createdById && req.user.role !== 'ADMIN'))) {
      return errorResponse(res, 403, 'Access denied. This album is not published.');
    }

    const albumWithStats = {
      ...album,
      photoCount: album._count.photos,
      _count: undefined,
    };

    return successResponse(
      res,
      200,
      'Album retrieved successfully',
      { album: albumWithStats }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new album
 * @route   POST /api/albums
 * @access  Private (Authenticated)
 */
export const createAlbum = async (req, res, next) => {
  try {
    const { title, description, shootDate, coverPhotoUrl, isPublished } = req.body;
    const userId = req.user.id;

    // Check if album with same title already exists for this user
    const existingAlbum = await prisma.album.findFirst({
      where: { 
        title: { equals: title, mode: 'insensitive' },
        createdById: userId,
      },
    });

    if (existingAlbum) {
      return errorResponse(res, 409, 'You already have an album with this title');
    }

    const album = await prisma.album.create({
      data: {
        title,
        description,
        shootDate: shootDate ? new Date(shootDate) : null,
        coverPhotoUrl,
        isPublished: isPublished || false,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        _count: {
          select: {
            photos: true,
          },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      action: 'CREATE',
      tableName: 'albums',
      recordId: album.id,
      newValues: album,
      ipAddress: req.ip,
    });

    const albumWithStats = {
      ...album,
      photoCount: album._count.photos,
      _count: undefined,
    };

    return successResponse(
      res,
      201,
      'Album created successfully',
      { album: albumWithStats }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update album
 * @route   PUT /api/albums/:id
 * @access  Private (Album owner or Admin)
 */
export const updateAlbum = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user.id;

    // Check if album exists
    const existingAlbum = await prisma.album.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingAlbum) {
      return errorResponse(res, 404, 'Album not found');
    }

    // Check if user has permission to update (owner or admin)
    if (existingAlbum.createdById !== userId && req.user.role !== 'ADMIN') {
      return errorResponse(res, 403, 'Access denied. You can only update your own albums.');
    }

    // If title is being updated, check for duplicates (only for same user)
    if (updateData.title && updateData.title !== existingAlbum.title) {
      const duplicateAlbum = await prisma.album.findFirst({
        where: {
          title: { equals: updateData.title, mode: 'insensitive' },
          createdById: existingAlbum.createdById,
          id: { not: parseInt(id) },
        },
      });

      if (duplicateAlbum) {
        return errorResponse(res, 409, 'You already have an album with this title');
      }
    }

    const oldValues = { ...existingAlbum };

    const album = await prisma.album.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        _count: {
          select: {
            photos: true,
          },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      action: 'UPDATE',
      tableName: 'albums',
      recordId: album.id,
      oldValues,
      newValues: album,
      ipAddress: req.ip,
    });

    const albumWithStats = {
      ...album,
      photoCount: album._count.photos,
      _count: undefined,
    };

    return successResponse(
      res,
      200,
      'Album updated successfully',
      { album: albumWithStats }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete album
 * @route   DELETE /api/albums/:id
 * @access  Private (Album owner or Admin)
 */
export const deleteAlbum = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if album exists
    const existingAlbum = await prisma.album.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            photos: true,
          },
        },
      },
    });

    if (!existingAlbum) {
      return errorResponse(res, 404, 'Album not found');
    }

    // Check if user has permission to delete (owner or admin)
    if (existingAlbum.createdById !== userId && req.user.role !== 'ADMIN') {
      return errorResponse(res, 403, 'Access denied. You can only delete your own albums.');
    }

    const oldValues = { ...existingAlbum };

    // Use transaction to delete album and its photos
    await prisma.$transaction(async (tx) => {
      // First delete all photos in the album
      await tx.photo.deleteMany({
        where: { albumId: parseInt(id) },
      });

      // Then delete the album
      await tx.album.delete({
        where: { id: parseInt(id) },
      });
    });

    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      action: 'DELETE',
      tableName: 'albums',
      recordId: parseInt(id),
      oldValues,
      ipAddress: req.ip,
    });

    return successResponse(res, 200, 'Album deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update album publish status
 * @route   PUT /api/albums/:id/publish
 * @access  Private (Album owner or Admin)
 */
export const publishAlbum = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;
    const userId = req.user.id;

    // Check if album exists
    const existingAlbum = await prisma.album.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingAlbum) {
      return errorResponse(res, 404, 'Album not found');
    }

    // Check if user has permission to update (owner or admin)
    if (existingAlbum.createdById !== userId && req.user.role !== 'ADMIN') {
      return errorResponse(res, 403, 'Access denied. You can only update your own albums.');
    }

    const oldValues = { isPublished: existingAlbum.isPublished };

    const album = await prisma.album.update({
      where: { id: parseInt(id) },
      data: { isPublished },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        _count: {
          select: {
            photos: true,
          },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      action: 'UPDATE_PUBLISH_STATUS',
      tableName: 'albums',
      recordId: album.id,
      oldValues,
      newValues: { isPublished },
      ipAddress: req.ip,
    });

    const albumWithStats = {
      ...album,
      photoCount: album._count.photos,
      _count: undefined,
    };

    const statusMessage = isPublished ? 'published' : 'unpublished';
    
    return successResponse(
      res,
      200,
      `Album ${statusMessage} successfully`,
      { album: albumWithStats }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all photos in an album
 * @route   GET /api/albums/:id/photos
 * @access  Public (if album published) / Private (if authenticated)
 */
export const getAlbumPhotos = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50, sortBy = 'sortOrder', sortOrder = 'asc' } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // First, get the album to check permissions
    const album = await prisma.album.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        title: true,
        isPublished: true,
        createdById: true,
      },
    });

    if (!album) {
      return errorResponse(res, 404, 'Album not found');
    }

    // Check if album is published - if not, only allow access to creator or admin
    if (!album.isPublished && (!req.user || (req.user.id !== album.createdById && req.user.role !== 'ADMIN'))) {
      return errorResponse(res, 403, 'Access denied. This album is not published.');
    }

    // Get photos with pagination
    const [photos, total, albumDetails] = await Promise.all([
      prisma.photo.findMany({
        where: { albumId: parseInt(id) },
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        include: {
          uploadedBy: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
          album: {
            select: {
              id: true,
              title: true,
              isPublished: true,
            },
          },
        },
      }),
      prisma.photo.count({
        where: { albumId: parseInt(id) },
      }),
      prisma.album.findUnique({
        where: { id: parseInt(id) },
        select: {
          title: true,
          description: true,
          coverPhotoUrl: true,
          isPublished: true,
          createdBy: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
        },
      }),
    ]);

    return paginatedResponse(
      res,
      photos,
      pageNum,
      limitNum,
      total,
      'Album photos retrieved successfully',
      { album: albumDetails }
    );
  } catch (error) {
    next(error);
  }
};