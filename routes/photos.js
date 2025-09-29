import express from 'express';
import Joi from 'joi';
import {
  getPhotoById,
  uploadPhoto,
  bulkUploadPhotos,
  updatePhoto,
  deletePhoto,
  reorderPhoto,
  reorderPhotosBatch,
} from '../controllers/photoController.js';
import { validate } from '../middleware/validation.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadSingle, uploadMultiple, handleUploadError } from '../middleware/upload.js';
import {
  uploadPhotoValidator,
  bulkUploadValidator,
  updatePhotoValidator,
  reorderPhotoValidator,
  photoIdValidator,
  albumIdParamValidator,
} from '../validators/photoValidators.js';

const router = express.Router();

/**
 * @swagger
 * /photos/{id}:
 *   get:
 *     summary: Get photo by ID
 *     description: Retrieve detailed information about a specific photo. Public access if album is published, authenticated users can access photos in their own albums.
 *     tags: [Photos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Photo ID
 *     responses:
 *       200:
 *         description: Photo retrieved successfully
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
 *                         photo:
 *                           allOf:
 *                             - $ref: '#/components/schemas/Photo'
 *                             - type: object
 *                               properties:
 *                                 imageVersions:
 *                                   type: object
 *                                   properties:
 *                                     original:
 *                                       type: string
 *                                       format: uri
 *                                     large:
 *                                       type: string
 *                                       format: uri
 *                                     medium:
 *                                       type: string
 *                                       format: uri
 *                                     thumbnail:
 *                                       type: string
 *                                       format: uri
 *                                 album:
 *                                   type: object
 *                                   properties:
 *                                     id:
 *                                       type: integer
 *                                     title:
 *                                       type: string
 *                                     isPublished:
 *                                       type: boolean
 *       403:
 *         description: Access denied to photo in unpublished album
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id', validate(photoIdValidator, { params: true }), getPhotoById);

/**
 * @swagger
 * /photos/albums/{id}/photos:
 *   post:
 *     summary: Upload single photo to album
 *     description: Upload a single photo to an album (Album owner or Admin only)
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Album ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - photo
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Image file (JPEG, PNG, WebP). Max size 10MB.
 *     responses:
 *       201:
 *         description: Photo uploaded successfully
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
 *                         photo:
 *                           allOf:
 *                             - $ref: '#/components/schemas/Photo'
 *                             - type: object
 *                               properties:
 *                                 imageVersions:
 *                                   type: object
 *                                 cloudinaryId:
 *                                   type: string
 *       400:
 *         description: No file uploaded or invalid file type
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post(
  '/albums/:id/photos',
  authenticate,
  validate(albumIdParamValidator, { params: true }),
  uploadSingle,
  handleUploadError,
  uploadPhoto
);

/**
 * @swagger
 * /photos/bulk-upload:
 *   post:
 *     summary: Bulk upload photos to album
 *     description: Upload multiple photos to an album at once (Album owner or Admin only)
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - photos
 *               - albumId
 *             properties:
 *               albumId:
 *                 type: integer
 *                 example: 1
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Multiple image files (JPEG, PNG, WebP). Max 20 files, 10MB each.
 *     responses:
 *       201:
 *         description: Photos uploaded successfully
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
 *                         photos:
 *                           type: array
 *                           items:
 *                             allOf:
 *                               - $ref: '#/components/schemas/Photo'
 *                               - type: object
 *                                 properties:
 *                                   imageVersions:
 *                                     type: object
 *       400:
 *         description: No files uploaded or invalid file types
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post(
  '/bulk-upload',
  authenticate,
  validate(bulkUploadValidator),
  uploadMultiple('photos', 20),
  handleUploadError,
  bulkUploadPhotos
);

/**
 * @swagger
 * /photos/{id}:
 *   put:
 *     summary: Update photo details
 *     description: Update photo information like filename or sort order (Photo owner or Admin only)
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Photo ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filename:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 example: "updated-filename.jpg"
 *               sortOrder:
 *                 type: integer
 *                 minimum: 0
 *                 example: 5
 *     responses:
 *       200:
 *         description: Photo updated successfully
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
 *                         photo:
 *                           $ref: '#/components/schemas/Photo'
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
  '/:id',
  authenticate,
  validate(photoIdValidator, { params: true }),
  validate(updatePhotoValidator),
  updatePhoto
);

/**
 * @swagger
 * /photos/{id}:
 *   delete:
 *     summary: Delete photo
 *     description: Delete a photo from album and Cloudinary storage (Photo owner or Admin only)
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Photo ID
 *     responses:
 *       200:
 *         description: Photo deleted successfully
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
router.delete(
  '/:id',
  authenticate,
  validate(photoIdValidator, { params: true }),
  deletePhoto
);

/**
 * @swagger
 * /photos/{id}/reorder:
 *   put:
 *     summary: Reorder single photo
 *     description: Update the sort order of a single photo in an album (Photo owner or Admin only)
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Photo ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sortOrder
 *             properties:
 *               sortOrder:
 *                 type: integer
 *                 minimum: 0
 *                 example: 10
 *     responses:
 *       200:
 *         description: Photo reordered successfully
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
 *                         photo:
 *                           $ref: '#/components/schemas/Photo'
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
  '/:id/reorder',
  authenticate,
  validate(photoIdValidator, { params: true }),
  validate(reorderPhotoValidator),
  reorderPhoto
);

/**
 * @swagger
 * /photos/reorder-batch:
 *   put:
 *     summary: Batch reorder photos
 *     description: Update sort orders for multiple photos in an album at once (Album owner or Admin only)
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - albumId
 *               - photoOrders
 *             properties:
 *               albumId:
 *                 type: integer
 *                 example: 1
 *               photoOrders:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - photoId
 *                     - sortOrder
 *                   properties:
 *                     photoId:
 *                       type: integer
 *                       example: 1
 *                     sortOrder:
 *                       type: integer
 *                       minimum: 0
 *                       example: 0
 *     responses:
 *       200:
 *         description: Photos reordered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
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
  '/reorder-batch',
  authenticate,
  validate(Joi.object({
    albumId: Joi.number().integer().positive().required(),
    photoOrders: Joi.array().items(
      Joi.object({
        photoId: Joi.number().integer().positive().required(),
        sortOrder: Joi.number().integer().min(0).required(),
      })
    ).min(1).required(),
  })),
  reorderPhotosBatch
);

export default router;