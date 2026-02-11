
import express from 'express';
import { getSettings, updateSettings, testConnection } from '../controllers/notification.controller.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authMiddleware);
router.use(requireAdmin); // Only admins (or Super Admins)

router.get('/settings', getSettings);
router.patch('/settings/:id', updateSettings);
router.post('/test', testConnection);

export default router;
