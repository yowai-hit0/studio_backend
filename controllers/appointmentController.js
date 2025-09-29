import prisma from '../config/database.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/responseFormatter.js';
import {
  checkAppointmentConflict,
  generateAvailableSlots,
  validateAppointmentDateTime,
  getAvailableDates,
  getServicesWithSlotInfo,
  isWeekend,
} from '../utils/appointmentHelpers.js';
import {
  sendAppointmentConfirmation,
  sendAppointmentReminder,
  sendStatusUpdate,
} from '../utils/emailService.js';

/**
 * @desc    Get all services with their slot patterns
 * @route   GET /api/appointments/services
 * @access  Public
 */
export const getServicesWithSlots = async (req, res, next) => {
  try {
    const services = await getServicesWithSlotInfo();

    return successResponse(
      res,
      200,
      'Services with slot information retrieved successfully',
      { services }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new appointment (Public)
 * @route   POST /api/appointments
 * @access  Public
 */
export const createAppointment = async (req, res, next) => {
  try {
    const {
      serviceId,
      appointmentDate,
      appointmentTime,
      customerName,
      customerEmail,
      customerPhone,
      specialRequests,
    } = req.body;

    // Check if service exists and is active
    const service = await prisma.service.findUnique({
      where: { id: serviceId, isActive: true },
    });

    if (!service) {
      return errorResponse(res, 404, 'Service not found or inactive');
    }

    // Validate appointment date and time with service duration
    const dateTimeValidation = validateAppointmentDateTime(
      appointmentDate, 
      appointmentTime, 
      service.durationMinutes
    );
    
    if (!dateTimeValidation.isValid) {
      return errorResponse(res, 400, dateTimeValidation.message);
    }

    // Check for appointment conflicts considering service duration
    const hasConflict = await checkAppointmentConflict(
      appointmentDate,
      appointmentTime,
      service.durationMinutes
    );

    if (hasConflict) {
      // Get available slots to suggest alternatives
      const availableSlots = await generateAvailableSlots(serviceId, new Date(appointmentDate));
      
      return errorResponse(
        res, 
        409, 
        'This time slot is already booked. Please choose a different time.',
        {
          availableSlots: availableSlots.slice(0, 5) // Suggest 5 alternative slots
        }
      );
    }

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        serviceId,
        appointmentDate: new Date(appointmentDate),
        appointmentTime,
        customerName,
        customerEmail,
        customerPhone,
        specialRequests,
        status: 'PENDING',
      },
      include: {
        service: true,
      },
    });

    // Send confirmation email
    await sendAppointmentConfirmation(appointment, service);

    // Create audit log (if authenticated user created it)
    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        action: 'CREATE',
        tableName: 'appointments',
        recordId: appointment.id,
        newValues: appointment,
        ipAddress: req.ip,
      });
    }

    return successResponse(
      res,
      201,
      'Appointment created successfully. Confirmation email sent.',
      { appointment }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Check available time slots for a service (Enhanced with service-duration slots)
 * @route   GET /api/appointments/available
 * @access  Public
 */
export const checkAvailableSlots = async (req, res, next) => {
  try {
    const { serviceId, date } = req.query;

    // Validate date is not weekend
    const selectedDate = new Date(date);
    if (isWeekend(selectedDate)) {
      return successResponse(
        res,
        200,
        'No available slots on weekends',
        { availableSlots: [] }
      );
    }

    const availableSlots = await generateAvailableSlots(parseInt(serviceId), selectedDate);

    // Get service info for response
    const service = await prisma.service.findUnique({
      where: { id: parseInt(serviceId) },
      select: {
        name: true,
        durationMinutes: true,
        price: true,
      },
    });

    return successResponse(
      res,
      200,
      availableSlots.length > 0 ? 'Available slots retrieved successfully' : 'No available slots for this date',
      { 
        availableSlots,
        serviceInfo: {
          name: service.name,
          duration: service.durationMinutes,
          price: service.price,
          slotPattern: `${service.durationMinutes}-minute slots`
        }
      }
    );
  } catch (error) {
    if (error.message === 'Service not found or inactive') {
      return errorResponse(res, 404, error.message);
    }
    next(error);
  }
};

/**
 * @desc    Get available dates for a service within a range
 * @route   GET /api/appointments/available-dates
 * @access  Public
 */
export const getAvailableDatesController = async (req, res, next) => {
  try {
    const { serviceId, startDate, endDate } = req.query;
    
    // Default to next 30 days if no range provided
    const defaultStartDate = new Date();
    const defaultEndDate = new Date();
    defaultEndDate.setDate(defaultEndDate.getDate() + 30);

    const start = startDate ? new Date(startDate) : defaultStartDate;
    const end = endDate ? new Date(endDate) : defaultEndDate;

    const availableDates = await getAvailableDates(
      parseInt(serviceId),
      start,
      end
    );

    return successResponse(
      res,
      200,
      'Available dates retrieved successfully',
      { 
        availableDates,
        dateRange: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        }
      }
    );
  } catch (error) {
    if (error.message === 'Service not found or inactive') {
      return errorResponse(res, 404, error.message);
    }
    next(error);
  }
};

/**
 * @desc    Get all appointments (Admin)
 * @route   GET /api/admin/appointments
 * @access  Private (Admin only)
 */
export const getAllAppointments = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status,
      dateFrom,
      dateTo,
      serviceId,
      sortBy = 'appointmentDate',
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
            { customerName: { contains: search, mode: 'insensitive' } },
            { customerEmail: { contains: search, mode: 'insensitive' } },
            { customerPhone: { contains: search, mode: 'insensitive' } },
          ],
        } : {},
        status ? { status } : {},
        serviceId ? { serviceId: parseInt(serviceId) } : {},
        dateFrom ? { appointmentDate: { gte: new Date(dateFrom) } } : {},
        dateTo ? { appointmentDate: { lte: new Date(dateTo) } } : {},
      ],
    };

    // Get appointments with pagination
    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        include: {
          service: {
            select: {
              id: true,
              name: true,
              durationMinutes: true,
              price: true,
            },
          },
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    return paginatedResponse(
      res,
      appointments,
      pageNum,
      limitNum,
      total,
      'Appointments retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single appointment by ID (Admin)
 * @route   GET /api/admin/appointments/:id
 * @access  Private (Admin only)
 */
export const getAppointmentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id: parseInt(id) },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            description: true,
            durationMinutes: true,
            price: true,
          },
        },
      },
    });

    if (!appointment) {
      return errorResponse(res, 404, 'Appointment not found');
    }

    return successResponse(
      res,
      200,
      'Appointment retrieved successfully',
      { appointment }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update appointment (Admin)
 * @route   PUT /api/admin/appointments/:id
 * @access  Private (Admin only)
 */
export const updateAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if appointment exists
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id: parseInt(id) },
      include: { service: true },
    });

    if (!existingAppointment) {
      return errorResponse(res, 404, 'Appointment not found');
    }

    let service = existingAppointment.service;

    // If service is being updated, get new service details
    if (updateData.serviceId && updateData.serviceId !== existingAppointment.serviceId) {
      const newService = await prisma.service.findUnique({
        where: { id: updateData.serviceId, isActive: true },
      });

      if (!newService) {
        return errorResponse(res, 404, 'Service not found or inactive');
      }
      service = newService;
    }

    // Check for conflicts if date/time is being updated
    if (updateData.appointmentDate || updateData.appointmentTime) {
      const appointmentDate = updateData.appointmentDate || existingAppointment.appointmentDate;
      const appointmentTime = updateData.appointmentTime || existingAppointment.appointmentTime;
      const durationMinutes = service.durationMinutes;

      const dateTimeValidation = validateAppointmentDateTime(appointmentDate, appointmentTime, durationMinutes);
      if (!dateTimeValidation.isValid) {
        return errorResponse(res, 400, dateTimeValidation.message);
      }

      const hasConflict = await checkAppointmentConflict(
        appointmentDate,
        appointmentTime,
        durationMinutes,
        parseInt(id)
      );

      if (hasConflict) {
        return errorResponse(res, 409, 'This time slot is already booked. Please choose a different time.');
      }
    }

    const oldValues = { ...existingAppointment };

    const appointment = await prisma.appointment.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        service: true,
      },
    });

    // Send status update email if status changed
    if (updateData.status && updateData.status !== existingAppointment.status) {
      await sendStatusUpdate(
        appointment,
        service,
        existingAppointment.status,
        updateData.status
      );
    }

    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      action: 'UPDATE',
      tableName: 'appointments',
      recordId: appointment.id,
      oldValues,
      newValues: appointment,
      ipAddress: req.ip,
    });

    return successResponse(
      res,
      200,
      'Appointment updated successfully',
      { appointment }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete appointment (Admin)
 * @route   DELETE /api/admin/appointments/:id
 * @access  Private (Admin only)
 */
export const deleteAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if appointment exists
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingAppointment) {
      return errorResponse(res, 404, 'Appointment not found');
    }

    const oldValues = { ...existingAppointment };

    await prisma.appointment.delete({
      where: { id: parseInt(id) },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      action: 'DELETE',
      tableName: 'appointments',
      recordId: parseInt(id),
      oldValues,
      ipAddress: req.ip,
    });

    return successResponse(res, 200, 'Appointment deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update appointment status (Admin)
 * @route   PUT /api/admin/appointments/:id/status
 * @access  Private (Admin only)
 */
export const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Check if appointment exists
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id: parseInt(id) },
      include: { service: true },
    });

    if (!existingAppointment) {
      return errorResponse(res, 404, 'Appointment not found');
    }

    const oldValues = { status: existingAppointment.status };

    const appointment = await prisma.appointment.update({
      where: { id: parseInt(id) },
      data: { status },
      include: {
        service: true,
      },
    });

    // Send status update email
    await sendStatusUpdate(
      appointment,
      existingAppointment.service,
      existingAppointment.status,
      status
    );

    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      action: 'UPDATE_STATUS',
      tableName: 'appointments',
      recordId: appointment.id,
      oldValues,
      newValues: { status },
      ipAddress: req.ip,
    });

    return successResponse(
      res,
      200,
      `Appointment status updated to ${status}`,
      { appointment }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get calendar appointments for a specific month (Admin)
 * @route   GET /api/admin/appointments/calendar/:year/:month
 * @access  Private (Admin only)
 */
export const getCalendarAppointments = async (req, res, next) => {
  try {
    const { year, month } = req.params;

    // Calculate date range for the month
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0); // Last day of the month

    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        appointmentDate: true,
        appointmentTime: true,
        customerName: true,
        status: true,
        service: {
          select: {
            name: true,
            durationMinutes: true,
          },
        },
      },
      orderBy: [
        { appointmentDate: 'asc' },
        { appointmentTime: 'asc' },
      ],
    });

    // Group appointments by date
    const calendarData = appointments.reduce((acc, appointment) => {
      const dateStr = appointment.appointmentDate.toISOString().split('T')[0];
      if (!acc[dateStr]) {
        acc[dateStr] = [];
      }
      
      // Calculate end time for display
      const [hours, minutes] = appointment.appointmentTime.split(':').map(Number);
      const startTime = new Date(appointment.appointmentDate);
      startTime.setHours(hours, minutes, 0, 0);
      const endTime = new Date(startTime.getTime() + appointment.service.durationMinutes * 60000);
      
      acc[dateStr].push({
        id: appointment.id,
        time: appointment.appointmentTime,
        endTime: endTime.toTimeString().slice(0, 5),
        customerName: appointment.customerName,
        status: appointment.status,
        service: appointment.service.name,
        duration: appointment.service.durationMinutes,
      });
      return acc;
    }, {});

    return successResponse(
      res,
      200,
      'Calendar appointments retrieved successfully',
      { calendar: calendarData }
    );
  } catch (error) {
    next(error);
  }
};