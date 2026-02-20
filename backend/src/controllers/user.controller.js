import pool from '../utils/prisma.js';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

// GET /api/users - List all users (SUPER_ADMIN only)
export const getUsers = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, phone, active, created_at FROM users ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      data: {
        users: result.rows,
        count: result.rows.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/:id - Get user by ID
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT id, email, name, role, phone, active, created_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: {
        user: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/users - Create new user
export const createUser = async (req, res, next) => {
  try {
    const { email, password, name, role, phone, active } = req.body;

    // Validation
    if (!email || !password || !name || !role) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, name, and role are required',
      });
    }

    const normalizedRole = String(role).trim().toUpperCase();
    const validRoles = ['SUPER_ADMIN', 'OPERATOR', 'PRINTER', 'FIELD'];
    if (!validRoles.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user role',
      });
    }

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = randomUUID();
    const isActive = typeof active === 'boolean' ? active : true;

    // Create user
    const result = await pool.query(
      `INSERT INTO users (id, email, password, name, role, phone, active, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) 
       RETURNING id, email, name, role, phone, active, created_at`,
      [userId, email, hashedPassword, name, normalizedRole, phone || null, isActive]
    );

    res.status(201).json({
      success: true,
      data: {
        user: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/users/:id - Update user
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, active, role } = req.body;

    // Build dynamic query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone);
    }
    if (active !== undefined) {
      updates.push(`active = $${paramCount++}`);
      values.push(active);
    }
    if (role !== undefined) {
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update',
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} 
       RETURNING id, email, name, role, phone, active, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: {
        user: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/users/:id - Soft delete user
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE users SET active = false, updated_at = NOW() WHERE id = $1 RETURNING id, email',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'User deactivated successfully',
      data: {
        user: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/printers - Get all printer users
export const getPrinters = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, email, name, phone FROM users 
       WHERE role = 'PRINTER' AND active = true 
       ORDER BY name`
    );

    res.json({
      success: true,
      data: {
        printers: result.rows,
        count: result.rows.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/field-teams - Get all field team users
export const getFieldTeams = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, email, name, phone FROM users 
       WHERE role = 'FIELD' AND active = true 
       ORDER BY name`
    );

    res.json({
      success: true,
      data: {
        fieldTeams: result.rows,
        count: result.rows.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/users/:id/password - Change user password
export const changePassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
      [hashedPassword, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, message: 'Password updated successfully' });
  } catch(error) {
     next(error);
  }
}
