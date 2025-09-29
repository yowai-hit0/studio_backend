import prisma from '../config/database.js';
import {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
} from '../utils/auth.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { successResponse, errorResponse } from '../utils/responseFormatter.js';

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return errorResponse(res, 401, 'Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      return errorResponse(res, 401, 'Account is deactivated. Please contact administrator.');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return errorResponse(res, 401, 'Invalid email or password');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate token payload
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    // Generate token
    const token = generateToken(tokenPayload);

    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: 'LOGIN',
      tableName: 'users',
      recordId: user.id,
      newValues: { lastLogin: new Date() },
      ipAddress: req.ip,
    });

    // Return user data without password
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
    };

    return successResponse(
      res,
      200,
      'Login successful',
      {
        user: userData,
        token,
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = async (req, res, next) => {
  try {
    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      action: 'LOGOUT',
      tableName: 'users',
      recordId: req.user.id,
      ipAddress: req.ip,
    });

    return successResponse(res, 200, 'Logout successful');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
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

    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    return successResponse(res, 200, 'User profile retrieved successfully', { user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change user password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(
      currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      return errorResponse(res, 400, 'Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedNewPassword },
    });

    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: 'CHANGE_PASSWORD',
      tableName: 'users',
      recordId: user.id,
      ipAddress: req.ip,
    });

    return successResponse(res, 200, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Refresh token
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return errorResponse(res, 401, 'Refresh token is required');
    }

    // Verify the refresh token
    const decoded = verifyToken(refreshToken);

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId, isActive: true },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return errorResponse(res, 401, 'Invalid refresh token');
    }

    // Generate new token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const newToken = generateToken(tokenPayload);

    return successResponse(
      res,
      200,
      'Token refreshed successfully',
      { token: newToken }
    );
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return errorResponse(res, 401, 'Invalid or expired refresh token');
    }
    next(error);
  }
};