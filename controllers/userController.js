import prisma from '../config/database.js';
import { hashPassword } from '../utils/auth.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/responseFormatter.js';

/**
 * @desc    Get all users with pagination and filtering
 * @route   GET /api/users
 * @access  Private (Admin only)
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      role,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {
      AND: [
        search ? {
          OR: [
            { username: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { fullName: { contains: search, mode: 'insensitive' } },
          ],
        } : {},
        role ? { role } : {},
        isActive !== undefined ? { isActive: isActive === 'true' } : {},
      ],
    };

    // Get users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              albums: true,
              photos: true,
              auditLogs: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Format response data
    const usersWithStats = users.map(user => ({
      ...user,
      albumCount: user._count.albums,
      photoCount: user._count.photos,
      auditLogCount: user._count.auditLogs,
      _count: undefined,
    }));

    return paginatedResponse(
      res,
      usersWithStats,
      pageNum,
      limitNum,
      total,
      'Users retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single user by ID
 * @route   GET /api/users/:id
 * @access  Private (Admin only)
 */
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        albums: {
          select: {
            id: true,
            title: true,
            isPublished: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        photos: {
          select: {
            id: true,
            filename: true,
            album: {
              select: {
                title: true,
              },
            },
            uploadedAt: true,
          },
          orderBy: { uploadedAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            albums: true,
            photos: true,
            auditLogs: true,
          },
        },
      },
    });

    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    const userWithStats = {
      ...user,
      albumCount: user._count.albums,
      photoCount: user._count.photos,
      auditLogCount: user._count.auditLogs,
      _count: undefined,
    };

    return successResponse(
      res,
      200,
      'User retrieved successfully',
      { user: userWithStats }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new user
 * @route   POST /api/users
 * @access  Private (Admin only)
 */
export const createUser = async (req, res, next) => {
  try {
    const { username, email, password, fullName, role } = req.body;

    // Check if user with same username or email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: username, mode: 'insensitive' } },
          { email: { equals: email, mode: 'insensitive' } },
        ],
      },
    });

    if (existingUser) {
      const field = existingUser.username === username ? 'username' : 'email';
      return errorResponse(res, 409, `User with this ${field} already exists`);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash: hashedPassword,
        fullName,
        role,
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      action: 'CREATE',
      tableName: 'users',
      recordId: user.id,
      newValues: user,
      ipAddress: req.ip,
    });

    return successResponse(
      res,
      201,
      'User created successfully',
      { user }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user
 * @route   PUT /api/users/:id
 * @access  Private (Admin only)
 */
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingUser) {
      return errorResponse(res, 404, 'User not found');
    }

    // Prevent updating own role or status
    if (parseInt(id) === req.user.id) {
      if (updateData.role && updateData.role !== existingUser.role) {
        return errorResponse(res, 400, 'Cannot change your own role');
      }
      if (updateData.isActive !== undefined && updateData.isActive !== existingUser.isActive) {
        return errorResponse(res, 400, 'Cannot change your own status');
      }
    }

    // If username or email is being updated, check for duplicates
    if (updateData.username || updateData.email) {
      const duplicateUser = await prisma.user.findFirst({
        where: {
          OR: [
            updateData.username ? { 
              username: { equals: updateData.username, mode: 'insensitive' },
              id: { not: parseInt(id) },
            } : {},
            updateData.email ? {
              email: { equals: updateData.email, mode: 'insensitive' },
              id: { not: parseInt(id) },
            } : {},
          ],
        },
      });

      if (duplicateUser) {
        const field = duplicateUser.username === updateData.username ? 'username' : 'email';
        return errorResponse(res, 409, `User with this ${field} already exists`);
      }
    }

    const oldValues = {
      username: existingUser.username,
      email: existingUser.email,
      fullName: existingUser.fullName,
      role: existingUser.role,
    };

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      action: 'UPDATE',
      tableName: 'users',
      recordId: user.id,
      oldValues,
      newValues: user,
      ipAddress: req.ip,
    });

    return successResponse(
      res,
      200,
      'User updated successfully',
      { user }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/users/:id
 * @access  Private (Admin only)
 */
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            albums: true,
            photos: true,
          },
        },
      },
    });

    if (!existingUser) {
      return errorResponse(res, 404, 'User not found');
    }

    // Prevent self-deletion
    if (parseInt(id) === req.user.id) {
      return errorResponse(res, 400, 'Cannot delete your own account');
    }

    // Check if user has related data
    if (existingUser._count.albums > 0 || existingUser._count.photos > 0) {
      return errorResponse(
        res,
        400,
        'Cannot delete user with existing albums or photos. Deactivate the user instead.'
      );
    }

    const oldValues = {
      username: existingUser.username,
      email: existingUser.email,
      fullName: existingUser.fullName,
      role: existingUser.role,
    };

    await prisma.user.delete({
      where: { id: parseInt(id) },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      action: 'DELETE',
      tableName: 'users',
      recordId: parseInt(id),
      oldValues,
      ipAddress: req.ip,
    });

    return successResponse(res, 200, 'User deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user status (active/inactive)
 * @route   PUT /api/users/:id/status
 * @access  Private (Admin only)
 */
export const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingUser) {
      return errorResponse(res, 404, 'User not found');
    }

    // Prevent self-deactivation
    if (parseInt(id) === req.user.id && !isActive) {
      return errorResponse(res, 400, 'Cannot deactivate your own account');
    }

    const oldValues = { isActive: existingUser.isActive };

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { isActive },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      action: 'UPDATE_STATUS',
      tableName: 'users',
      recordId: user.id,
      oldValues,
      newValues: { isActive },
      ipAddress: req.ip,
    });

    const statusMessage = isActive ? 'activated' : 'deactivated';
    
    return successResponse(
      res,
      200,
      `User ${statusMessage} successfully`,
      { user }
    );
  } catch (error) {
    next(error);
  }
};