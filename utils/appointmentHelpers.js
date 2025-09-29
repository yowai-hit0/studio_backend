import prisma from '../config/database.js';

/**
 * Check if a date is a weekend
 * @param {Date} date - Date to check
 * @returns {boolean} True if weekend
 */
export const isWeekend = (date) => {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sunday, 6 = Saturday
};

/**
 * Check for appointment conflicts considering service duration
 * @param {Date} appointmentDate - Appointment date
 * @param {string} appointmentTime - Appointment time (HH:MM)
 * @param {number} durationMinutes - Service duration in minutes
 * @param {number} excludeAppointmentId - Appointment ID to exclude (for updates)
 * @returns {Promise<boolean>} True if conflict exists
 */
export const checkAppointmentConflict = async (
  appointmentDate,
  appointmentTime,
  durationMinutes,
  excludeAppointmentId = null
) => {
  // Parse the appointment time and calculate end time
  const [hours, minutes] = appointmentTime.split(':').map(Number);
  const appointmentDateTime = new Date(appointmentDate);
  appointmentDateTime.setHours(hours, minutes, 0, 0);

  const endDateTime = new Date(appointmentDateTime.getTime() + durationMinutes * 60000);
  const endTimeString = endDateTime.toTimeString().slice(0, 5);

  // Get all appointments on the same date that could potentially conflict
  const where = {
    appointmentDate: appointmentDate,
    status: {
      in: ['PENDING', 'CONFIRMED'],
    },
  };

  // Exclude current appointment for updates
  if (excludeAppointmentId) {
    where.id = { not: excludeAppointmentId };
  }

  const existingAppointments = await prisma.appointment.findMany({
    where,
    include: {
      service: {
        select: {
          durationMinutes: true,
        },
      },
    },
  });

  // Check each existing appointment for overlap
  for (const existingApp of existingAppointments) {
    const [existingHours, existingMinutes] = existingApp.appointmentTime.split(':').map(Number);
    const existingStart = new Date(existingApp.appointmentDate);
    existingStart.setHours(existingHours, existingMinutes, 0, 0);
    
    const existingEnd = new Date(existingStart.getTime() + existingApp.service.durationMinutes * 60000);

    // Check for time overlap (any overlap means conflict)
    const hasOverlap = appointmentDateTime < existingEnd && endDateTime > existingStart;
    
    if (hasOverlap) {
      console.log(`Conflict detected: New appointment (${appointmentTime}-${endTimeString}, ${durationMinutes}min) overlaps with existing (${existingApp.appointmentTime}-${existingEnd.toTimeString().slice(0, 5)}, ${existingApp.service.durationMinutes}min)`);
      return true;
    }
  }

  return false;
};

/**
 * Generate time slots based on service duration
 * @param {Date} date - Date for slots
 * @param {Object} service - Service object with duration
 * @param {Array} busyRanges - Array of busy time ranges
 * @returns {Array} Available time slots
 */
const generateSlotsForService = (date, service, busyRanges) => {
  const availableSlots = [];
  
  // Business hours: 9 AM to 6 PM
  const businessHours = {
    start: 9,  // 9 AM
    end: 18,   // 6 PM
  };

  const durationMinutes = service.durationMinutes;
  
  // Start from business opening time
  let currentTime = new Date(date);
  currentTime.setHours(businessHours.start, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(businessHours.end, 0, 0, 0);

  // Generate slots using service duration as step
  while (currentTime < endOfDay) {
    const slotStart = new Date(currentTime);
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

    // Check if slot would end after business hours
    if (slotEnd > endOfDay) {
      break; // Stop if slot would extend beyond business hours
    }

    const slotTime = slotStart.toTimeString().slice(0, 5);
    const slotEndTime = slotEnd.toTimeString().slice(0, 5);

    // Check for conflicts with existing appointments
    let isAvailable = true;
    
    for (const busyRange of busyRanges) {
      // Check if new slot would overlap with any busy range
      if (slotStart.getTime() < busyRange.end && slotEnd.getTime() > busyRange.start) {
        isAvailable = false;
        break;
      }
    }

    if (isAvailable) {
      availableSlots.push({
        time: slotTime,
        duration: durationMinutes,
        endTime: slotEndTime,
        service: service.name,
        price: service.price,
        slotDuration: `${durationMinutes} minutes`
      });
    }

    // Move to next slot using service duration as step
    currentTime = new Date(slotEnd);
  }

  return availableSlots;
};

/**
 * Generate available time slots for a service on a specific date
 * @param {number} serviceId - Service ID
 * @param {Date} date - Date to check availability
 * @returns {Promise<Array>} Array of available time slots
 */
export const generateAvailableSlots = async (serviceId, date) => {
  // Check if date is a weekend
  if (isWeekend(date)) {
    return [];
  }

  const service = await prisma.service.findUnique({
    where: { id: serviceId, isActive: true },
  });

  if (!service) {
    throw new Error('Service not found or inactive');
  }

  // Get all appointments for the date (across all services)
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      appointmentDate: date,
      status: {
        in: ['PENDING', 'CONFIRMED'],
      },
    },
    include: {
      service: true,
    },
    orderBy: { appointmentTime: 'asc' },
  });

  // Convert existing appointments to busy time ranges
  const busyRanges = existingAppointments.map(appointment => {
    const [hours, minutes] = appointment.appointmentTime.split(':').map(Number);
    const start = new Date(date);
    start.setHours(hours, minutes, 0, 0);
    
    const end = new Date(start.getTime() + appointment.service.durationMinutes * 60000);
    
    return {
      start: start.getTime(),
      end: end.getTime(),
      startTime: appointment.appointmentTime,
      endTime: end.toTimeString().slice(0, 5),
      service: appointment.service.name,
      duration: appointment.service.durationMinutes,
    };
  });

  // Generate slots specific to this service's duration
  const availableSlots = generateSlotsForService(date, service, busyRanges);

  return availableSlots;
};

/**
 * Validate appointment date and time considering weekends and business hours
 * @param {Date} date - Appointment date
 * @param {string} time - Appointment time
 * @param {number} durationMinutes - Service duration in minutes
 * @returns {Object} Validation result
 */
export const validateAppointmentDateTime = (date, time, durationMinutes = 0) => {
  const appointmentDateTime = new Date(date);
  const [hours, minutes] = time.split(':').map(Number);
  appointmentDateTime.setHours(hours, minutes, 0, 0);

  const now = new Date();
  
  // Check if appointment is in the past
  if (appointmentDateTime < now) {
    return { isValid: false, message: 'Appointment cannot be in the past' };
  }

  // Check if appointment is on weekend
  if (isWeekend(appointmentDateTime)) {
    return { isValid: false, message: 'Appointments are not available on weekends' };
  }

  // Check business hours (9 AM to 6 PM)
  const businessStart = new Date(date);
  businessStart.setHours(9, 0, 0, 0);
  
  const businessEnd = new Date(date);
  businessEnd.setHours(18, 0, 0, 0);

  // Calculate appointment end time
  const appointmentEnd = new Date(appointmentDateTime.getTime() + durationMinutes * 60000);

  if (appointmentDateTime < businessStart) {
    return { isValid: false, message: 'Appointments are only available from 9:00 AM' };
  }

  if (appointmentEnd > businessEnd) {
    return { 
      isValid: false, 
      message: `Appointment would end after business hours (6:00 PM). Please choose an earlier time.` 
    };
  }

  return { isValid: true };
};

/**
 * Get available dates for a service within a date range
 * @param {number} serviceId - Service ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Array of available dates
 */
export const getAvailableDates = async (serviceId, startDate, endDate) => {
  const service = await prisma.service.findUnique({
    where: { id: serviceId, isActive: true },
  });

  if (!service) {
    throw new Error('Service not found or inactive');
  }

  const availableDates = [];
  const currentDate = new Date(startDate);
  const finalEndDate = new Date(endDate);

  while (currentDate <= finalEndDate) {
    // Skip weekends
    if (!isWeekend(currentDate)) {
      const slots = await generateAvailableSlots(serviceId, new Date(currentDate));
      if (slots.length > 0) {
        availableDates.push({
          date: currentDate.toISOString().split('T')[0],
          availableSlots: slots.length,
          slots: slots.slice(0, 3), // Show first 3 slots as examples
        });
      }
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return availableDates;
};

/**
 * Get all services with their slot patterns for frontend reference
 * @returns {Promise<Array>} Array of services with slot information
 */
export const getServicesWithSlotInfo = async () => {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      durationMinutes: true,
      price: true,
      description: true,
    },
  });

  return services.map(service => ({
    ...service,
    slotPattern: `Slots of ${service.durationMinutes} minutes`,
    exampleSlots: generateExampleSlots(service.durationMinutes),
  }));
};

/**
 * Generate example slots for a service duration
 * @param {number} durationMinutes - Service duration in minutes
 * @returns {Array} Example time slots
 */
const generateExampleSlots = (durationMinutes) => {
  const examples = [];
  let currentTime = new Date();
  currentTime.setHours(9, 0, 0, 0); // Start at 9 AM

  for (let i = 0; i < 3; i++) {
    const slotStart = new Date(currentTime);
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);
    
    examples.push({
      start: slotStart.toTimeString().slice(0, 5),
      end: slotEnd.toTimeString().slice(0, 5),
    });

    // Move to next slot
    currentTime = new Date(slotEnd);
  }

  return examples;
};