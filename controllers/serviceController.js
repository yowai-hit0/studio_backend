import prisma from '../config/database.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/responseFormatter.js';

/**
 * @desc    Get all services with pagination and filtering
 * @route   GET /api/services
 * @access  Public
 */
export const getAllServices = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      isActive,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {
      AND: [
        search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        } : {},
        isActive !== undefined ? { isActive: isActive === 'true' } : {},
      ],
    };

    // Get services with pagination
    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          name: true,
          description: true,
          durationMinutes: true,
          price: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              appointments: true,
            },
          },
        },
      }),
      prisma.service.count({ where }),
    ]);

    // Format response data
    const servicesWithAppointmentCount = services.map(service => ({
      ...service,
      appointmentCount: service._count.appointments,
      // Remove the _count field
      _count: undefined,
    }));

    return paginatedResponse(
      res,
      servicesWithAppointmentCount,
      pageNum,
      limitNum,
      total,
      'Services retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single service by ID
 * @route   GET /api/services/:id
 * @access  Public
 */
export const getServiceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const service = await prisma.service.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        name: true,
        description: true,
        durationMinutes: true,
        price: true,
        isActive: true,
        createdAt: true,
        appointments: {
          select: {
            id: true,
            appointmentDate: true,
            customerName: true,
            status: true,
          },
          orderBy: { appointmentDate: 'desc' },
          take: 10, // Last 10 appointments
        },
        _count: {
          select: {
            appointments: true,
          },
        },
      },
    });

    if (!service) {
      return errorResponse(res, 404, 'Service not found');
    }

    const serviceWithStats = {
      ...service,
      appointmentCount: service._count.appointments,
      _count: undefined,
    };

    return successResponse(
      res,
      200,
      'Service retrieved successfully',
      { service: serviceWithStats }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new service
 * @route   POST /api/services
 * @access  Private (Admin only)
 */
export const createService = async (req, res, next) => {
  try {
    const { name, description, durationMinutes, price } = req.body;

    // Check if service with same name already exists
    const existingService = await prisma.service.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

    if (existingService) {
      return errorResponse(res, 409, 'Service with this name already exists');
    }

    const service = await prisma.service.create({
      data: {
        name,
        description,
        durationMinutes,
        price,
      },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      action: 'CREATE',
      tableName: 'services',
      recordId: service.id,
      newValues: service,
      ipAddress: req.ip,
    });

    return successResponse(
      res,
      201,
      'Service created successfully',
      { service }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update service
 * @route   PUT /api/services/:id
 * @access  Private (Admin only)
 */
export const updateService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if service exists
    const existingService = await prisma.service.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingService) {
      return errorResponse(res, 404, 'Service not found');
    }

    // If name is being updated, check for duplicates
    if (updateData.name && updateData.name !== existingService.name) {
      const duplicateService = await prisma.service.findFirst({
        where: {
          name: { equals: updateData.name, mode: 'insensitive' },
          id: { not: parseInt(id) },
        },
      });

      if (duplicateService) {
        return errorResponse(res, 409, 'Service with this name already exists');
      }
    }

    const oldValues = { ...existingService };

    const service = await prisma.service.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      action: 'UPDATE',
      tableName: 'services',
      recordId: service.id,
      oldValues,
      newValues: service,
      ipAddress: req.ip,
    });

    return successResponse(
      res,
      200,
      'Service updated successfully',
      { service }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete service
 * @route   DELETE /api/services/:id
 * @access  Private (Admin only)
 */
export const deleteService = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if service exists
    const existingService = await prisma.service.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: { appointments: true },
        },
      },
    });

    if (!existingService) {
      return errorResponse(res, 404, 'Service not found');
    }

    // Check if service has appointments
    if (existingService._count.appointments > 0) {
      return errorResponse(
        res,
        400,
        'Cannot delete service that has appointments. Deactivate it instead.'
      );
    }

    const oldValues = { ...existingService };

    await prisma.service.delete({
      where: { id: parseInt(id) },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      action: 'DELETE',
      tableName: 'services',
      recordId: parseInt(id),
      oldValues,
      ipAddress: req.ip,
    });

    return successResponse(res, 200, 'Service deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update service status (active/inactive)
 * @route   PUT /api/services/:id/status
 * @access  Private (Admin only)
 */
export const updateServiceStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    // Check if service exists
    const existingService = await prisma.service.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingService) {
      return errorResponse(res, 404, 'Service not found');
    }

    const oldValues = { isActive: existingService.isActive };

    const service = await prisma.service.update({
      where: { id: parseInt(id) },
      data: { isActive },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      action: 'UPDATE_STATUS',
      tableName: 'services',
      recordId: service.id,
      oldValues,
      newValues: { isActive },
      ipAddress: req.ip,
    });

    const statusMessage = isActive ? 'activated' : 'deactivated';
    
    return successResponse(
      res,
      200,
      `Service ${statusMessage} successfully`,
      { service }
    );
  } catch (error) {
    next(error);
  }
};