import jwt from 'jsonwebtoken';
import { config } from '../config/environment.js';
import prisma from '../config/database.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId, isActive: true },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or user not found.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (condition) {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.',
      });
    } 
    res.status(401).json({
      success: false,
      message: 'Invalid token.',
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
      });
    }
    next();
  };
};

export const preventSelfModification = (req, res, next) => {
  const targetUserId = parseInt(req.params.id);
  
  if (targetUserId === req.user.id) {
    return res.status(400).json({
      success: false,
      message: 'Cannot modify your own account through this endpoint.',
    });
  }
  
  next();
};