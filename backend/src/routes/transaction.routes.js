
import express from 'express';
import { createTransaction, getAccountTransactions } from '../controllers/transaction.controller.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(['SUPER_ADMIN', 'OPERATOR']));

// POST /api/transactions - Add payment
router.post('/', createTransaction);

// GET /api/transactions/account/:accountId - List payments
router.get('/account/:accountId', getAccountTransactions);

export default router;
