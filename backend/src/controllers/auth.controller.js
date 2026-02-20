import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../utils/prisma.js';
import { sendEmail } from '../services/email.service.js';

// Helper: Get client IP
const getClientIp = (req) => {
  return req.ip || req.connection.remoteAddress || 'unknown';
};

// Helper: Check login rate limit
const checkLoginRateLimit = async (email, ip) => {
  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    // Count failed attempts in last 15 minutes
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM login_attempts 
       WHERE email = $1 AND success = false AND created_at > $2`,
      [email, fifteenMinutesAgo]
    );
    
    const failedAttempts = parseInt(result.rows[0].count);
    
    if (failedAttempts >= 5) {
      return {
        allowed: false,
        message: 'Too many failed login attempts. Please try again after 15 minutes.',
        remainingTime: 15
      };
    }
    
    return {
      allowed: true,
      remainingAttempts: 5 - failedAttempts
    };
  } catch (error) {
    // If table doesn't exist, skip rate limiting
    console.error('Rate limiting check failed:', error.message);
    return { allowed: true, remainingAttempts: 5 };
  }
};

// Helper: Log login attempt
const logLoginAttempt = async (email, ip, success) => {
  try {
    await pool.query(
      `INSERT INTO login_attempts (email, ip_address, success, created_at) 
       VALUES ($1, $2, $3, NOW())`,
      [email, ip, success]
    );
  } catch (error) {
    console.error('Failed to log login attempt:', error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ip = getClientIp(req);

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    // Check rate limit
    const rateLimitCheck = await checkLoginRateLimit(email, ip);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: rateLimitCheck.message,
      });
    }

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND active = true LIMIT 1',
      [email]
    );

    if (result.rows.length === 0) {
      await logLoginAttempt(email, ip, false);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        remainingAttempts: rateLimitCheck.remainingAttempts ? rateLimitCheck.remainingAttempts - 1 : undefined,
      });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      await logLoginAttempt(email, ip, false);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        remainingAttempts: rateLimitCheck.remainingAttempts ? rateLimitCheck.remainingAttempts - 1 : undefined,
      });
    }

    // Log successful login
    await logLoginAttempt(email, ip, true);

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '8h' }
    );

    // Return response
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const me = async (req, res, next) => {
  try {
    // req.user will be set by authMiddleware
    res.json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Forgot Password - Request reset token
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    // Find user
    const userResult = await pool.query(
      'SELECT id, email, name FROM users WHERE email = $1 AND active = true',
      [email]
    );

    // Don't reveal if user exists (security)
    if (userResult.rows.length === 0) {
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link will be sent.',
      });
    }

    const user = userResult.rows[0];

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token to database
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [user.id, resetToken, expiresAt]
    );

    // Send email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5;">Password Reset</h2>
          <p>Hello ${user.name},</p>
          <p>You requested a password reset. Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            This link will expire in 1 hour. If you didn't request this, please ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;"/>
          <p style="color: #999; font-size: 12px;">
            Baygunes Pole Banner Management System
          </p>
        </div>
      `
    });

    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link will be sent.',
    });
  } catch (error) {
    next(error);
  }
};

// Reset Password - Use token to set new password
export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token and new password are required',
      });
    }

    // Password validation
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long',
      });
    }

    // Find valid token
    const tokenResult = await pool.query(
      `SELECT prt.*, u.email 
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token = $1 
       AND prt.expires_at > NOW() 
       AND prt.used_at IS NULL`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token',
      });
    }

    const resetToken = tokenResult.rows[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, resetToken.user_id]
    );

    // Mark token as used
    await pool.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
      [resetToken.id]
    );

    // Send confirmation email
    await sendEmail({
      to: resetToken.email,
      subject: 'Password Reset Successful',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">Password Reset Successful</h2>
          <p>Your password has been successfully reset.</p>
          <p>You can now log in with your new password.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/login" 
               style="display: inline-block; padding: 12px 24px; background: #059669; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Go to Login
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;"/>
          <p style="color: #999; font-size: 12px;">
            Baygunes Pole Banner Management System
          </p>
        </div>
      `
    });

    res.json({
      success: true,
      message: 'Password reset successful. You can now log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

// Validate reset token
export const validateResetToken = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required',
      });
    }

    const tokenResult = await pool.query(
      `SELECT id FROM password_reset_tokens 
       WHERE token = $1 
       AND expires_at > NOW() 
       AND used_at IS NULL`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: 'Invalid or expired token',
      });
    }

    res.json({
      success: true,
      valid: true,
    });
  } catch (error) {
    next(error);
  }
};
