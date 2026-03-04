import express from 'express';
import {
  getPoles,
  getPoleById,
  createPole,
  updatePole,
  deletePole,
  restorePole,
  getAvailablePoles,
  checkAvailability,
  reverseGeocodePoleLocation,
} from '../controllers/pole.controller.js';
import {
  createPoleCapture,
  deletePoleCaptures,
  getPoleCaptureGroups,
  importPoleCaptures,
  listPoleCaptures,
} from '../controllers/pole.capture.controller.js';
import { bulkUpdatePoles, bulkDeletePoles } from '../controllers/pole.bulk.controller.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Bulk operations (must be before /:id routes)
router.patch('/bulk-update', roleMiddleware(['SUPER_ADMIN', 'OPERATOR']), bulkUpdatePoles);
router.post('/bulk-delete', roleMiddleware(['SUPER_ADMIN']), bulkDeletePoles);

// GET /api/poles/available - Must be before /:id route
router.get('/available', getAvailablePoles);

// POST /api/poles/check-availability
router.post('/check-availability', checkAvailability);

// GET /api/poles - List all poles
router.get('/', getPoles);

// POST /api/poles/reverse-geocode
router.post(
  '/reverse-geocode',
  roleMiddleware(['SUPER_ADMIN', 'OPERATOR', 'FIELD']),
  reverseGeocodePoleLocation
);

// Temporary mobile capture endpoints
router.get('/staging', roleMiddleware(['SUPER_ADMIN', 'OPERATOR', 'FIELD']), listPoleCaptures);
router.get('/staging/groups', roleMiddleware(['SUPER_ADMIN', 'OPERATOR', 'FIELD']), getPoleCaptureGroups);
router.post('/staging', roleMiddleware(['SUPER_ADMIN', 'OPERATOR', 'FIELD']), createPoleCapture);
router.post('/staging/import', roleMiddleware(['SUPER_ADMIN', 'OPERATOR']), importPoleCaptures);
router.post('/staging/delete', roleMiddleware(['SUPER_ADMIN', 'OPERATOR']), deletePoleCaptures);

// GET /api/poles/:id - Get pole by ID
router.get('/:id', getPoleById);

// POST /api/poles - Create new pole (SUPER_ADMIN, OPERATOR)
router.post('/', roleMiddleware(['SUPER_ADMIN', 'OPERATOR']), createPole);

// PATCH /api/poles/:id - Update pole (SUPER_ADMIN, OPERATOR)
router.patch('/:id', roleMiddleware(['SUPER_ADMIN', 'OPERATOR']), updatePole);

// DELETE /api/poles/:id - Delete pole (SUPER_ADMIN only)
router.delete('/:id', roleMiddleware(['SUPER_ADMIN']), deletePole);

// POST /api/poles/:id/restore - Restore soft-deleted pole (SUPER_ADMIN only)
router.post('/:id/restore', roleMiddleware(['SUPER_ADMIN']), restorePole);

export default router;
