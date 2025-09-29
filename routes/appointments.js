import express from 'express';
import {
  getServicesWithSlots,
  createAppointment,
  checkAvailableSlots,
  getAvailableDatesController,
  getAllAppointments,
  getAppointmentById,
  updateAppointment,
  deleteAppointment,
  updateAppointmentStatus,
  getCalendarAppointments,
} from '../controllers/appointmentController.js';
import { validate } from '../middleware/validation.js';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  createAppointmentValidator,
  checkAvailabilityValidator,
  availableDatesValidator,
  appointmentIdValidator,
  appointmentQueryValidator,
  appointmentStatusValidator,
  calendarQueryValidator,
  updateAppointmentValidator,
} from '../validators/appointmentValidators.js';

const router = express.Router();

/**
 * @swagger
 * /appointments/services:
 *   get:
 *     summary: Get all services with slot patterns
 *     description: Retrieve all active services with their slot duration patterns and examples
 *     tags: [Appointments]
 *     responses:
 *       200:
 *         description: Services with slot information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         services:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 1
 *                               name:
 *                                 type: string
 *                                 example: "Quick Portrait"
 *                               durationMinutes:
 *                                 type: integer
 *                                 example: 45
 *                               price:
 *                                 type: number
 *                                 format: float
 *                                 example: 149.99
 *                               description:
 *                                 type: string
 *                                 example: "45-minute portrait session"
 *                               slotPattern:
 *                                 type: string
 *                                 example: "Slots of 45 minutes"
 *                               exampleSlots:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     start:
 *                                       type: string
 *                                       example: "09:00"
 *                                     end:
 *                                       type: string
 *                                       example: "09:45"
 */
router.get('/services', getServicesWithSlots);

/**
 * @swagger
 * /appointments:
 *   post:
 *     summary: Create new appointment
 *     description: Create a new photography appointment (Public endpoint)
 *     tags: [Appointments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceId
 *               - appointmentDate
 *               - appointmentTime
 *               - customerName
 *               - customerEmail
 *               - customerPhone
 *             properties:
 *               serviceId:
 *                 type: integer
 *                 example: 1
 *               appointmentDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-15"
 *               appointmentTime:
 *                 type: string
 *                 pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                 example: "14:30"
 *               customerName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: "John Doe"
 *               customerEmail:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               customerPhone:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 15
 *                 example: "+1234567890"
 *               specialRequests:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Outdoor photoshoot preferred"
 *     responses:
 *       201:
 *         description: Appointment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         appointment:
 *                           $ref: '#/components/schemas/Appointment'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         description: Service not found or inactive
 *       409:
 *         description: Time slot is already booked
 */
router.post('/', validate(createAppointmentValidator), createAppointment);

/**
 * @swagger
 * /appointments/available:
 *   get:
 *     summary: Check available time slots
 *     description: Get available time slots for a service on a specific date
 *     tags: [Appointments]
 *     parameters:
 *       - in: query
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Service ID
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to check availability (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Available slots retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         availableSlots:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               time:
 *                                 type: string
 *                                 example: "09:00"
 *                               duration:
 *                                 type: integer
 *                                 example: 60
 *                               endTime:
 *                                 type: string
 *                                 example: "10:00"
 *                               service:
 *                                 type: string
 *                                 example: "Portrait Session"
 *                               price:
 *                                 type: number
 *                                 format: float
 *                                 example: 199.99
 *                               slotDuration:
 *                                 type: string
 *                                 example: "60 minutes"
 *                         serviceInfo:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                             duration:
 *                               type: integer
 *                             price:
 *                               type: number
 *                             slotPattern:
 *                               type: string
 *       404:
 *         description: Service not found or inactive
 */
router.get('/available', validate(checkAvailabilityValidator, { query: true }), checkAvailableSlots);

/**
 * @swagger
 * /appointments/available-dates:
 *   get:
 *     summary: Get available dates for a service
 *     description: Retrieve dates with available slots for a service within a date range
 *     tags: [Appointments]
 *     parameters:
 *       - in: query
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Service ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for search range (defaults to today)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for search range (defaults to 30 days from today)
 *     responses:
 *       200:
 *         description: Available dates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         availableDates:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               date:
 *                                 type: string
 *                                 format: date
 *                                 example: "2024-01-15"
 *                               availableSlots:
 *                                 type: integer
 *                                 example: 8
 *                               slots:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     time:
 *                                       type: string
 *                                       example: "09:00"
 *                                     endTime:
 *                                       type: string
 *                                       example: "10:00"
 *                         dateRange:
 *                           type: object
 *                           properties:
 *                             start:
 *                               type: string
 *                               format: date
 *                             end:
 *                               type: string
 *                               format: date
 *       404:
 *         description: Service not found or inactive
 */
router.get('/available-dates', validate(availableDatesValidator, { query: true }), getAvailableDatesController);

// Admin routes
const adminRouter = express.Router();

// All admin routes require authentication and admin role
adminRouter.use(authenticate, authorize('ADMIN'));

/**
 * @swagger
 * /appointments/admin:
 *   get:
 *     summary: Get all appointments (Admin)
 *     description: Retrieve paginated list of all appointments with filtering (Admin only)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/pageParam'
 *       - $ref: '#/components/parameters/limitParam'
 *       - $ref: '#/components/parameters/searchParam'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW]
 *         description: Filter by appointment status
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date
 *       - in: query
 *         name: serviceId
 *         schema:
 *           type: integer
 *         description: Filter by service ID
 *       - $ref: '#/components/parameters/sortByParam'
 *       - $ref: '#/components/parameters/sortOrderParam'
 *     responses:
 *       200:
 *         description: Appointments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/Appointment'
 *                           - type: object
 *                             properties:
 *                               service:
 *                                 $ref: '#/components/schemas/Service'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
adminRouter.get('/', validate(appointmentQueryValidator, { query: true }), getAllAppointments);

/**
 * @swagger
 * /appointments/admin/calendar/{year}/{month}:
 *   get:
 *     summary: Get calendar appointments
 *     description: Retrieve all appointments for a specific month in calendar format (Admin only)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 2020
 *           maximum: 2030
 *         description: Year (e.g., 2024)
 *       - in: path
 *         name: month
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Month (1-12)
 *     responses:
 *       200:
 *         description: Calendar appointments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         calendar:
 *                           type: object
 *                           additionalProperties:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: integer
 *                                 time:
 *                                   type: string
 *                                 endTime:
 *                                   type: string
 *                                 customerName:
 *                                   type: string
 *                                 status:
 *                                   type: string
 *                                 service:
 *                                   type: string
 *                                 duration:
 *                                   type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
adminRouter.get('/calendar/:year/:month', validate(calendarQueryValidator, { params: true }), getCalendarAppointments);

/**
 * @swagger
 * /appointments/admin/{id}:
 *   get:
 *     summary: Get appointment by ID (Admin)
 *     description: Retrieve detailed information about a specific appointment (Admin only)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Appointment ID
 *     responses:
 *       200:
 *         description: Appointment retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         appointment:
 *                           allOf:
 *                             - $ref: '#/components/schemas/Appointment'
 *                             - type: object
 *                               properties:
 *                                 service:
 *                                   $ref: '#/components/schemas/Service'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
adminRouter.get('/:id', validate(appointmentIdValidator, { params: true }), getAppointmentById);

/**
 * @swagger
 * /appointments/admin/{id}:
 *   put:
 *     summary: Update appointment (Admin)
 *     description: Update appointment information (Admin only)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Appointment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               serviceId:
 *                 type: integer
 *                 example: 1
 *               appointmentDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-15"
 *               appointmentTime:
 *                 type: string
 *                 example: "15:00"
 *               customerName:
 *                 type: string
 *                 example: "John Doe"
 *               customerEmail:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               customerPhone:
 *                 type: string
 *                 example: "+1234567890"
 *               status:
 *                 type: string
 *                 enum: [PENDING, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW]
 *                 example: "CONFIRMED"
 *               specialRequests:
 *                 type: string
 *                 example: "Updated special requests"
 *     responses:
 *       200:
 *         description: Appointment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         appointment:
 *                           allOf:
 *                             - $ref: '#/components/schemas/Appointment'
 *                             - type: object
 *                               properties:
 *                                 service:
 *                                   $ref: '#/components/schemas/Service'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         description: Time slot is already booked
 */
adminRouter.put(
  '/:id',
  validate(appointmentIdValidator, { params: true }),
  validate(updateAppointmentValidator),
  updateAppointment
);

/**
 * @swagger
 * /appointments/admin/{id}:
 *   delete:
 *     summary: Delete appointment (Admin)
 *     description: Delete an appointment (Admin only)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Appointment ID
 *     responses:
 *       200:
 *         description: Appointment deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
adminRouter.delete(
  '/:id',
  validate(appointmentIdValidator, { params: true }),
  deleteAppointment
);

/**
 * @swagger
 * /appointments/admin/{id}/status:
 *   put:
 *     summary: Update appointment status (Admin)
 *     description: Update the status of an appointment (Admin only)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Appointment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW]
 *                 example: "CONFIRMED"
 *     responses:
 *       200:
 *         description: Appointment status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         appointment:
 *                           allOf:
 *                             - $ref: '#/components/schemas/Appointment'
 *                             - type: object
 *                               properties:
 *                                 service:
 *                                   $ref: '#/components/schemas/Service'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
adminRouter.put(
  '/:id/status',
  validate(appointmentIdValidator, { params: true }),
  validate(appointmentStatusValidator),
  updateAppointmentStatus
);

// Mount admin routes
router.use('/admin', adminRouter);

export default router;