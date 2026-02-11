import express from 'express';
import { getPricing, updatePricing } from '../controllers/pricing.controller.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', authMiddleware, roleMiddleware(['SUPER_ADMIN']), getPricing);
router.put('/', authMiddleware, roleMiddleware(['SUPER_ADMIN']), updatePricing);

export default router;
