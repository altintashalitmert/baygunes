import pool from '../utils/prisma.js';

// GET /api/accounts - List all accounts
export const getAccounts = async (req, res, next) => {
  try {

    const { search } = req.query;
    let query = `
      SELECT a.*, 
      (SELECT COUNT(*) FROM orders o WHERE o.account_id = a.id AND o.status <> 'CANCELLED') as total_orders,
      (SELECT COALESCE(SUM(price), 0) FROM orders o WHERE o.account_id = a.id AND o.status <> 'CANCELLED') as total_debt,
      (SELECT COALESCE(SUM(amount), 0) FROM transactions t WHERE t.account_id = a.id) as total_paid
      FROM accounts a 
      WHERE 1=1
    `;
    const params = [];
    
    if (search) {
      query += ` AND (a.company_name ILIKE $1 OR a.contact_name ILIKE $1 OR a.email ILIKE $1)`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY a.created_at DESC';

    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: { accounts: result.rows }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/accounts/:id - Get detail
export const getAccountById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const accountRes = await pool.query('SELECT * FROM accounts WHERE id = $1', [id]);
    
    if (accountRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }


    // Get Orders history
    const ordersRes = await pool.query(`
      SELECT o.*, p.pole_code, p.city, p.district 
      FROM orders o
      JOIN poles p ON o.pole_id = p.id
      WHERE o.account_id = $1
        AND o.status <> 'CANCELLED'
      ORDER BY o.created_at DESC
    `, [id]);

    // Get Transactions history
    const transactionsRes = await pool.query(`
      SELECT * FROM transactions WHERE account_id = $1 ORDER BY transaction_date DESC
    `, [id]);

    // Calculate Summary
    const totalDebt = ordersRes.rows.reduce((sum, o) => sum + (parseFloat(o.price) || 0), 0);
    const totalPaid = transactionsRes.rows.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const balance = totalDebt - totalPaid;

    res.json({
      success: true,
      data: {
        account: {
           ...accountRes.rows[0],
           balance: balance,
           total_debt: totalDebt,
           total_paid: totalPaid
        },
        orders: ordersRes.rows,
        transactions: transactionsRes.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/accounts - Create
export const createAccount = async (req, res, next) => {
  try {
    const { type, company_name, contact_name, email, phone, tax_no, tax_office, address } = req.body;

    const result = await pool.query(
      `INSERT INTO accounts (type, company_name, contact_name, email, phone, tax_no, tax_office, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [type || 'CORPORATE', company_name, contact_name, email, phone, tax_no, tax_office, address]
    );

    res.status(201).json({
      success: true,
      data: { account: result.rows[0] }
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/accounts/:id - Update
export const updateAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    
    // SECURITY: Whitelist allowed columns to prevent SQL injection via object keys
    const ALLOWED_COLUMNS = ['type', 'company_name', 'contact_name', 'email', 'phone', 'tax_no', 'tax_office', 'address', 'notes'];
    
    const keys = Object.keys(fields).filter(key => ALLOWED_COLUMNS.includes(key));
    if (keys.length === 0) return res.status(400).json({ error: 'No valid fields provided' });

    const setString = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = keys.map(key => fields[key]);

    const result = await pool.query(
      `UPDATE accounts SET ${setString}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Account not found' });

    res.json({
      success: true,
      data: { account: result.rows[0] }
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/accounts/:id - Delete account if it has no linked history
export const deleteAccount = async (req, res, next) => {
  try {
    const { id } = req.params;

    const accountRes = await pool.query(
      'SELECT id, company_name, contact_name FROM accounts WHERE id = $1',
      [id]
    );

    if (accountRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    const [ordersRes, transactionsRes] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM orders WHERE account_id = $1', [id]),
      pool.query('SELECT COUNT(*)::int AS count FROM transactions WHERE account_id = $1', [id]),
    ]);

    const orderCount = ordersRes.rows[0]?.count || 0;
    const transactionCount = transactionsRes.rows[0]?.count || 0;

    if (orderCount > 0 || transactionCount > 0) {
      return res.status(409).json({
        success: false,
        error:
          'Bu müşteri hesabına bağlı sipariş veya tahsilat kaydı var. Veri kaybını önlemek için silme engellendi.',
        data: {
          orderCount,
          transactionCount,
        },
      });
    }

    await pool.query('DELETE FROM accounts WHERE id = $1', [id]);

    res.json({
      success: true,
      data: {
        id,
        name:
          accountRes.rows[0].company_name || accountRes.rows[0].contact_name || 'Unnamed account',
      },
    });
  } catch (error) {
    next(error);
  }
};
