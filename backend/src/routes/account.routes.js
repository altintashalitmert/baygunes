import express from 'express';
import { getAccounts, getAccountById, createAccount, updateAccount, deleteAccount } from '../controllers/account.controller.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(['SUPER_ADMIN', 'OPERATOR']));

router.get('/', getAccounts);
router.get('/:id', getAccountById);
router.post('/', createAccount);
router.patch('/:id', updateAccount);
router.delete('/:id', roleMiddleware(['SUPER_ADMIN']), deleteAccount);

export default router;
