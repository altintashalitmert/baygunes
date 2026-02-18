import express from 'express';
import { rollbackOrderStatus, getWorkflowHistory } from '../controllers/workflow.controller.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/workflow/:orderId/history
router.get('/:orderId/history', authMiddleware, getWorkflowHistory);

// POST /api/workflow/:orderId/rollback (Super Admin only)
router.post('/:orderId/rollback', authMiddleware, roleMiddleware(['SUPER_ADMIN']), rollbackOrderStatus);

export default router;
