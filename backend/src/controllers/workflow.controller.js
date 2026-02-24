import pool from '../utils/prisma.js';
import { sendEmail } from '../services/email.service.js';
import { randomUUID } from 'crypto';

// Helper to get user email
const getUserEmailById = async (dbClient, userId) => {
  if (!userId) return null;
  const result = await dbClient.query(
    `SELECT email FROM users WHERE id = $1 AND active = true LIMIT 1`,
    [userId]
  );
  return result.rows[0]?.email || null;
};

// Helper to get admin emails
const getAdminEmails = async (dbClient = pool) => {
  const result = await dbClient.query(
    `SELECT email FROM users WHERE active = true AND role = 'SUPER_ADMIN'`
  );
  return result.rows.map((row) => row.email).filter(Boolean);
};

// POST /api/workflow/:orderId/rollback - Rollback order status
export const rollbackOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { targetStatus, reason } = req.body;
    const user = req.user;

    // Only Super Admin can rollback
    if (user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Only SUPER_ADMIN can rollback order status',
      });
    }

    if (!targetStatus) {
      return res.status(400).json({
        success: false,
        error: 'targetStatus is required',
      });
    }

    // Get order
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Cannot rollback terminal states
    if (['COMPLETED', 'CANCELLED'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot rollback from terminal state (COMPLETED or CANCELLED)',
      });
    }

    // Get workflow history to find if this is a valid rollback
    const historyResult = await pool.query(
      `SELECT * FROM workflow_history 
       WHERE order_id = $1 
       ORDER BY timestamp DESC`,
      [orderId]
    );

    if (historyResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No workflow history found for this order',
      });
    }

    // Check if target status exists in history (valid rollback targets)
    const validRollbackTargets = historyResult.rows
      .filter(h => h.old_status !== null)
      .map(h => h.old_status);
    
    // Also allow rolling back to specific states that make sense
    const allowedRollbackTargets = [
      ...new Set([...validRollbackTargets, 'PENDING', 'PRINTING', 'AWAITING_MOUNT'])
    ];

    if (!allowedRollbackTargets.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        error: `Cannot rollback to ${targetStatus}. Valid targets: ${allowedRollbackTargets.join(', ')}`,
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const oldStatus = order.status;

      // Update order status
      await client.query(
        `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2`,
        [targetStatus, orderId]
      );

      // Record rollback in workflow history
      await client.query(
        `INSERT INTO workflow_history (id, order_id, old_status, new_status, changed_by, notes, is_rollback)
         VALUES ($1, $2, $3, $4, $5, $6, true)`,
        [randomUUID(), orderId, oldStatus, targetStatus, user.id, `ROLLBACK: ${reason || 'No reason provided'}`]
      );

      // Handle pole status based on rollback target
      if (targetStatus === 'PENDING' || targetStatus === 'SCHEDULED') {
        // If rolling back to early stage, free the pole if it was occupied
        if (['PRINTING', 'AWAITING_MOUNT', 'LIVE', 'EXPIRED'].includes(oldStatus)) {
          await client.query(
            `UPDATE poles SET status = 'AVAILABLE', updated_at = NOW() WHERE id = $1`,
            [order.pole_id]
          );
        }
      } else if (targetStatus === 'LIVE' || targetStatus === 'EXPIRED') {
        // If rolling back to active states, ensure pole is occupied
        await client.query(
          `UPDATE poles SET status = 'OCCUPIED', updated_at = NOW() WHERE id = $1`,
          [order.pole_id]
        );
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `Order status rolled back from ${oldStatus} to ${targetStatus}`,
        data: {
          orderId,
          oldStatus,
          newStatus: targetStatus,
          reason: reason || 'No reason provided',
        },
      });

      // Send notification
      try {
        const recipients = await getAdminEmails(pool);
        
        if (order.assigned_printer) {
          const printerEmail = await getUserEmailById(pool, order.assigned_printer);
          if (printerEmail) recipients.push(printerEmail);
        }
        if (order.assigned_field) {
          const fieldEmail = await getUserEmailById(pool, order.assigned_field);
          if (fieldEmail) recipients.push(fieldEmail);
        }

        await sendEmail({
          to: [...new Set(recipients)].filter(Boolean),
          subject: `Sipariş Durumu Geri Alındı: ${order.client_name}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #f59e0b;">Durum Geri Alındı (Rollback)</h2>
              <p><strong>Müşteri:</strong> ${order.client_name}</p>
              <p><strong>Eski Durum:</strong> ${oldStatus}</p>
              <p><strong>Yeni Durum:</strong> ${targetStatus}</p>
              <p><strong>Sebep:</strong> ${reason || 'Belirtilmedi'}</p>
              <p><strong>İşlem Yapan:</strong> ${user.name}</p>
            </div>
          `
        });
      } catch (e) {
        console.error('Rollback notification email failed:', e);
      }
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// GET /api/workflow/:orderId/history - Get workflow history
export const getWorkflowHistory = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const user = req.user;

    // Check if user can access this order
    const orderResult = await pool.query(
      `SELECT assigned_printer, assigned_field FROM orders WHERE id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Check permissions
    if (user.role === 'PRINTER' && order.assigned_printer !== user.id) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    if (user.role === 'FIELD' && order.assigned_field !== user.id) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    // Get workflow history with user details
    const historyResult = await pool.query(
      `SELECT 
        wh.*,
        u.name as changed_by_name,
        u.role as changed_by_role
       FROM workflow_history wh
       LEFT JOIN users u ON u.id = wh.changed_by
       WHERE wh.order_id = $1
       ORDER BY wh.timestamp DESC`,
      [orderId]
    );

    res.json({
      success: true,
      data: {
        orderId,
        history: historyResult.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};
