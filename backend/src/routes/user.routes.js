import express from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getPrinters,
  getFieldTeams,
  changePassword,
} from '../controllers/user.controller.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/users - List all users (SUPER_ADMIN only)
router.get('/', roleMiddleware(['SUPER_ADMIN']), getUsers);

// GET /api/users/printers - List printers (SUPER_ADMIN, OPERATOR)
router.get('/printers', roleMiddleware(['SUPER_ADMIN', 'OPERATOR']), getPrinters);

// GET /api/users/field-teams - List field teams (SUPER_ADMIN, OPERATOR)
router.get('/field-teams', roleMiddleware(['SUPER_ADMIN', 'OPERATOR']), getFieldTeams);

// GET /api/users/:id - Get user by ID (SUPER_ADMIN only)
router.get('/:id', roleMiddleware(['SUPER_ADMIN']), getUserById);

// POST /api/users - Create new user (SUPER_ADMIN only)
router.post('/', roleMiddleware(['SUPER_ADMIN']), createUser);

// PATCH /api/users/:id - Update user (SUPER_ADMIN only)
router.patch('/:id', roleMiddleware(['SUPER_ADMIN']), updateUser);

// PATCH /api/users/:id/password - Change password (SUPER_ADMIN only)
router.patch('/:id/password', roleMiddleware(['SUPER_ADMIN']), changePassword);

// DELETE /api/users/:id - Soft delete user (SUPER_ADMIN only)
router.delete('/:id', roleMiddleware(['SUPER_ADMIN']), deleteUser);

export default router;
