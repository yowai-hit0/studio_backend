import express from 'express';
import Joi from 'joi';
import {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  updateServiceStatus,
} from '../controllers/serviceController.js';
import { validate } from '../middleware/validation.js';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  createServiceValidator,
  updateServiceValidator,
  serviceIdValidator,
  serviceQueryValidator,
} from '../validators/serviceValidators.js';

const router = express.Router();

/**
 * @swagger
 * /services:
 *   get:
 *     summary: Get all services
 *     description: Retrieve paginated list of photography services. Public access for active services.
 *     tags: [Services]
 *     parameters:
 *       - $ref: '#/components/parameters/pageParam'
 *       - $ref: '#/components/parameters/limitParam'
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Search in service name or description
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, price, durationMinutes, createdAt]
 *           default: name
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Services retrieved successfully
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
 *                           - $ref: '#/components/schemas/Service'
 *                           - type: object
 *                             properties:
 *                               appointmentCount:
 *                                 type: integer
 *                                 description: Number of appointments for this service
 *                                 example: 15
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *             examples:
 *               success:
 *                 summary: Services list
 *                 value:
 *                   success: true
 *                   message: "Services retrieved successfully"
 *                   data:
 *                     - id: 1
 *                       name: "Portrait Session"
 *                       description: "Professional portrait photography session"
 *                       durationMinutes: 60
 *                       price: 199.99
 *                       isActive: true
 *                       createdAt: "2024-01-15T10:00:00.000Z"
 *                       appointmentCount: 15
 *                     - id: 2
 *                       name: "Wedding Photography"
 *                       description: "Full day wedding photography coverage"
 *                       durationMinutes: 480
 *                       price: 1499.99
 *                       isActive: true
 *                       createdAt: "2024-01-10T09:00:00.000Z"
 *                       appointmentCount: 8
 *                   pagination:
 *                     page: 1
 *                     limit: 10
 *                     total: 2
 *                     totalPages: 1
 *                     hasNext: false
 *                     hasPrev: false
 *                     nextPage: null
 *                     prevPage: null
 */
router.get('/', validate(serviceQueryValidator, { query: true }), getAllServices);

/**
 * @swagger
 * /services/{id}:
 *   get:
 *     summary: Get service by ID
 *     description: Retrieve detailed information about a specific photography service including recent appointments.
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Service ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Service retrieved successfully
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
 *                         service:
 *                           allOf:
 *                             - $ref: '#/components/schemas/Service'
 *                             - type: object
 *                               properties:
 *                                 appointments:
 *                                   type: array
 *                                   description: Recent appointments for this service (last 10)
 *                                   items:
 *                                     type: object
 *                                     properties:
 *                                       id:
 *                                         type: integer
 *                                         example: 1
 *                                       appointmentDate:
 *                                         type: string
 *                                         format: date
 *                                         example: "2024-01-20"
 *                                       customerName:
 *                                         type: string
 *                                         example: "John Doe"
 *                                       status:
 *                                         type: string
 *                                         enum: [PENDING, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW]
 *                                         example: "CONFIRMED"
 *                                 appointmentCount:
 *                                   type: integer
 *                                   description: Total number of appointments for this service
 *                                   example: 25
 *             examples:
 *               success:
 *                 summary: Service details
 *                 value:
 *                   success: true
 *                   message: "Service retrieved successfully"
 *                   data:
 *                     service:
 *                       id: 1
 *                       name: "Portrait Session"
 *                       description: "Professional portrait photography session"
 *                       durationMinutes: 60
 *                       price: 199.99
 *                       isActive: true
 *                       createdAt: "2024-01-15T10:00:00.000Z"
 *                       appointments:
 *                         - id: 1
 *                           appointmentDate: "2024-01-20"
 *                           customerName: "John Doe"
 *                           status: "CONFIRMED"
 *                         - id: 2
 *                           appointmentDate: "2024-01-25"
 *                           customerName: "Jane Smith"
 *                           status: "PENDING"
 *                       appointmentCount: 25
 *       404:
 *         description: Service not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               notFound:
 *                 summary: Service not found
 *                 value:
 *                   success: false
 *                   message: "Service not found"
 */
router.get('/:id', validate(serviceIdValidator, { params: true }), getServiceById);

/**
 * @swagger
 * /services:
 *   post:
 *     summary: Create new service
 *     description: Create a new photography service (Admin only)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - durationMinutes
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Service name
 *                 example: "Wedding Photography"
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *                 description: Detailed service description
 *                 example: "Full day wedding photography coverage with professional editing"
 *               durationMinutes:
 *                 type: integer
 *                 minimum: 15
 *                 maximum: 480
 *                 description: Service duration in minutes
 *                 example: 480
 *               price:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 maximum: 10000
 *                 description: Service price
 *                 example: 1499.99
 *           examples:
 *             weddingService:
 *               summary: Wedding photography service
 *               value:
 *                 name: "Wedding Photography"
 *                 description: "Full day wedding photography coverage with professional editing and album"
 *                 durationMinutes: 480
 *                 price: 1499.99
 *             portraitService:
 *               summary: Portrait session service
 *               value:
 *                 name: "Professional Portrait Session"
 *                 description: "One-hour professional portrait session with 10 edited digital photos"
 *                 durationMinutes: 60
 *                 price: 199.99
 *     responses:
 *       201:
 *         description: Service created successfully
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
 *                         service:
 *                           $ref: '#/components/schemas/Service'
 *             examples:
 *               success:
 *                 summary: Service created
 *                 value:
 *                   success: true
 *                   message: "Service created successfully"
 *                   data:
 *                     service:
 *                       id: 3
 *                       name: "Wedding Photography"
 *                       description: "Full day wedding photography coverage with professional editing and album"
 *                       durationMinutes: 480
 *                       price: 1499.99
 *                       isActive: true
 *                       createdAt: "2024-01-20T14:30:00.000Z"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               validationError:
 *                 summary: Validation failed
 *                 value:
 *                   success: false
 *                   message: "Validation failed"
 *                   errors:
 *                     - field: "durationMinutes"
 *                       message: "Duration must be at least 15 minutes"
 *                     - field: "price"
 *                       message: "Price must be positive"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       409:
 *         description: Service with this name already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               duplicate:
 *                 summary: Duplicate service name
 *                 value:
 *                   success: false
 *                   message: "Service with this name already exists"
 */
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validate(createServiceValidator),
  createService
);

/**
 * @swagger
 * /services/{id}:
 *   put:
 *     summary: Update service
 *     description: Update an existing photography service (Admin only)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Service ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Service name
 *                 example: "Updated Portrait Session"
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *                 description: Service description
 *                 example: "Updated description with more details"
 *               durationMinutes:
 *                 type: integer
 *                 minimum: 15
 *                 maximum: 480
 *                 description: Service duration in minutes
 *                 example: 90
 *               price:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 maximum: 10000
 *                 description: Service price
 *                 example: 249.99
 *               isActive:
 *                 type: boolean
 *                 description: Service active status
 *                 example: true
 *           examples:
 *             updatePrice:
 *               summary: Update service price
 *               value:
 *                 price: 249.99
 *                 description: "Now includes additional edited photos"
 *             updateAll:
 *               summary: Update multiple fields
 *               value:
 *                 name: "Premium Portrait Session"
 *                 description: "Extended 90-minute session with 20 edited digital photos"
 *                 durationMinutes: 90
 *                 price: 249.99
 *                 isActive: true
 *     responses:
 *       200:
 *         description: Service updated successfully
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
 *                         service:
 *                           $ref: '#/components/schemas/Service'
 *             examples:
 *               success:
 *                 summary: Service updated
 *                 value:
 *                   success: true
 *                   message: "Service updated successfully"
 *                   data:
 *                     service:
 *                       id: 1
 *                       name: "Premium Portrait Session"
 *                       description: "Extended 90-minute session with 20 edited digital photos"
 *                       durationMinutes: 90
 *                       price: 249.99
 *                       isActive: true
 *                       createdAt: "2024-01-15T10:00:00.000Z"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         description: Service with this name already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               duplicate:
 *                 summary: Duplicate service name
 *                 value:
 *                   success: false
 *                   message: "Service with this name already exists"
 */
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate(serviceIdValidator, { params: true }),
  validate(updateServiceValidator),
  updateService
);

/**
 * @swagger
 * /services/{id}:
 *   delete:
 *     summary: Delete service
 *     description: Delete a photography service. Cannot delete services with existing appointments. (Admin only)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Service ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Service deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             examples:
 *               success:
 *                 summary: Service deleted
 *                 value:
 *                   success: true
 *                   message: "Service deleted successfully"
 *       400:
 *         description: Cannot delete service with appointments
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               hasAppointments:
 *                 summary: Service has appointments
 *                 value:
 *                   success: false
 *                   message: "Cannot delete service that has appointments. Deactivate it instead."
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate(serviceIdValidator, { params: true }),
  deleteService
);

/**
 * @swagger
 * /services/{id}/status:
 *   put:
 *     summary: Update service status
 *     description: Activate or deactivate a service (Admin only)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Service ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 description: Service active status
 *                 example: false
 *           examples:
 *             deactivate:
 *               summary: Deactivate service
 *               value:
 *                 isActive: false
 *             activate:
 *               summary: Activate service
 *               value:
 *                 isActive: true
 *     responses:
 *       200:
 *         description: Service status updated successfully
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
 *                         service:
 *                           $ref: '#/components/schemas/Service'
 *             examples:
 *               deactivated:
 *                 summary: Service deactivated
 *                 value:
 *                   success: true
 *                   message: "Service deactivated successfully"
 *                   data:
 *                     service:
 *                       id: 1
 *                       name: "Portrait Session"
 *                       description: "Professional portrait photography session"
 *                       durationMinutes: 60
 *                       price: 199.99
 *                       isActive: false
 *                       createdAt: "2024-01-15T10:00:00.000Z"
 *               activated:
 *                 summary: Service activated
 *                 value:
 *                   success: true
 *                   message: "Service activated successfully"
 *                   data:
 *                     service:
 *                       id: 1
 *                       name: "Portrait Session"
 *                       description: "Professional portrait photography session"
 *                       durationMinutes: 60
 *                       price: 199.99
 *                       isActive: true
 *                       createdAt: "2024-01-15T10:00:00.000Z"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put(
  '/:id/status',
  authenticate,
  authorize('ADMIN'),
  validate(serviceIdValidator, { params: true }),
  validate(Joi.object({ isActive: Joi.boolean().required() })),
  updateServiceStatus
);

export default router;