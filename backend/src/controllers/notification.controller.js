
import pool from '../utils/prisma.js';

// GET /api/notifications/settings - Get all settings
export const getSettings = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM notification_settings ORDER BY provider');
    res.json({
      success: true,
      data: { settings: result.rows }
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/notifications/settings/:id - Update specific provider
export const updateSettings = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_active, is_demo, config } = req.body;
    
    // Safety: Mask passwords if returning, but here we update.
    // If config contains '***', merged with existing? For now, we expect full config or partial update logic.
    // Assuming admin sends full config for simplicity.
    
    const result = await pool.query(
      `UPDATE notification_settings 
       SET is_active = $1, is_demo = $2, config = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [is_active, is_demo, config, id]
    );

    res.json({
      success: true,
      data: { setting: result.rows[0] }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/notifications/test - Test connection
export const testConnection = async (req, res, next) => {
  try {
     const { provider, config } = req.body;
     // Implement simple ping/test logic here depending on provider
     // For now, fake success
     res.json({ success: true, message: `Test for ${provider} successful (Mock)` });
  } catch(error) {
     next(error);
  }
}
