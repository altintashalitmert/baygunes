import express from 'express';
import {
  getPoles,
  getPoleById,
  createPole,
  updatePole,
  deletePole,
  getAvailablePoles,
  checkAvailability,
} from '../controllers/pole.controller.js';
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

// GET /api/poles/:id - Get pole by ID
router.get('/:id', getPoleById);

// POST /api/poles - Create new pole (SUPER_ADMIN, OPERATOR)
router.post('/', roleMiddleware(['SUPER_ADMIN', 'OPERATOR']), createPole);

// PATCH /api/poles/:id - Update pole (SUPER_ADMIN, OPERATOR)
router.patch('/:id', roleMiddleware(['SUPER_ADMIN', 'OPERATOR']), updatePole);

// DELETE /api/poles/:id - Delete pole (SUPER_ADMIN only)
router.delete('/:id', roleMiddleware(['SUPER_ADMIN']), deletePole);

export default router;
