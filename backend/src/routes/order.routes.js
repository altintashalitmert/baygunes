import express from 'express';
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  uploadOrderFile,
  assignPrinter,
  assignFieldTeam,
  getMyTasks,
  cancelOrder,
  updateOrder,
} from '../controllers/order.controller.js';
import { generateOrderPdf } from '../controllers/report.controller.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = express.Router();


router.post('/', authMiddleware, roleMiddleware(['SUPER_ADMIN', 'OPERATOR']), createOrder);
router.get('/', authMiddleware, roleMiddleware(['SUPER_ADMIN', 'OPERATOR', 'PRINTER', 'FIELD']), getOrders);
router.get('/my-tasks', authMiddleware, roleMiddleware(['PRINTER', 'FIELD']), getMyTasks);
router.get('/:id', authMiddleware, roleMiddleware(['SUPER_ADMIN', 'OPERATOR', 'PRINTER', 'FIELD']), getOrderById);
router.patch('/:id', authMiddleware, roleMiddleware(['SUPER_ADMIN', 'OPERATOR']), updateOrder);
router.patch('/:id/status', authMiddleware, roleMiddleware(['SUPER_ADMIN', 'OPERATOR', 'PRINTER', 'FIELD']), updateOrderStatus);
router.delete('/:id', authMiddleware, roleMiddleware(['SUPER_ADMIN']), cancelOrder);
router.patch('/:id/assign-printer', authMiddleware, roleMiddleware(['SUPER_ADMIN', 'OPERATOR']), assignPrinter);
router.patch('/:id/assign-field', authMiddleware, roleMiddleware(['SUPER_ADMIN', 'OPERATOR']), assignFieldTeam);

// PDF Report
router.get('/:id/pdf', authMiddleware, roleMiddleware(['SUPER_ADMIN', 'OPERATOR', 'PRINTER', 'FIELD']), generateOrderPdf);

// Upload routes
router.post('/:id/upload/contract', authMiddleware, roleMiddleware(['SUPER_ADMIN', 'OPERATOR']), upload.single('contract'), uploadOrderFile);
router.post('/:id/upload/image', authMiddleware, roleMiddleware(['SUPER_ADMIN', 'OPERATOR']), upload.single('image'), uploadOrderFile);
router.post('/:id/upload/proof', authMiddleware, roleMiddleware(['SUPER_ADMIN', 'OPERATOR', 'FIELD']), upload.single('proof'), uploadOrderFile);

export default router;
