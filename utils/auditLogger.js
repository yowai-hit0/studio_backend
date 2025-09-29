import prisma from '../config/database.js';

/**
 * Create audit log entry
 * @param {Object} params - Audit log parameters
 * @param {number} params.userId - User ID who performed the action
 * @param {string} params.action - Action performed
 * @param {string} params.tableName - Table name affected
 * @param {number} params.recordId - Record ID affected
 * @param {Object} params.oldValues - Old values (for updates)
 * @param {Object} params.newValues - New values (for updates/creates)
 * @param {string} params.ipAddress - IP address of the requester
 */
export const createAuditLog = async ({
  userId,
  action,
  tableName,
  recordId,
  oldValues = null,
  newValues = null,
  ipAddress = null,
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        tableName,
        recordId,
        oldValues: oldValues ? JSON.stringify(oldValues) : null,
        newValues: newValues ? JSON.stringify(newValues) : null,
        ipAddress,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to avoid breaking the main operation
  }
};