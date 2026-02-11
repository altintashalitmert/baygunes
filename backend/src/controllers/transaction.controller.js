
import pool from '../utils/prisma.js';

// POST /api/transactions - Create a new payment/transaction
export const createTransaction = async (req, res, next) => {
  try {
    const { accountId, orderId, amount, type, description } = req.body;
    const user = req.user;

    if (!accountId || !amount || !type) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Create Transaction Record
      const txRes = await client.query(
        `INSERT INTO transactions (account_id, order_id, amount, type, description, created_by, transaction_date)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING *`,
        [accountId, orderId || null, amount, type, description || '', user.id]
      );
      const transaction = txRes.rows[0];

      // 2. If Order ID is present, update the order's paid_amount
      if (orderId) {
        await client.query(
          `UPDATE orders 
           SET paid_amount = COALESCE(paid_amount, 0) + $1,
               updated_at = NOW()
           WHERE id = $2`,
          [amount, orderId]
        );
      }

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        data: { transaction }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// GET /api/transactions/account/:accountId - List transactions for an account
export const getAccountTransactions = async (req, res, next) => {
  try {
    const { accountId } = req.params;

    const result = await pool.query(
      `SELECT t.*, u.name as created_by_name, o.pole_id, p.pole_code
       FROM transactions t
       JOIN users u ON t.created_by = u.id
       LEFT JOIN orders o ON t.order_id = o.id
       LEFT JOIN poles p ON o.pole_id = p.id
       WHERE t.account_id = $1
       ORDER BY t.transaction_date DESC`,
      [accountId]
    );

    res.json({
      success: true,
      data: { transactions: result.rows }
    });
  } catch (error) {
    next(error);
  }
};
