import pool from '../utils/prisma.js';

// PATCH /api/poles/bulk-update - Bulk update poles
export const bulkUpdatePoles = async (req, res, next) => {
  try {
    const { poleIds, status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required for bulk update',
      });
    }

    if (!poleIds || !Array.isArray(poleIds) || poleIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'poleIds array is required',
      });
    }

    const result = await pool.query(
      'UPDATE poles SET status = $1, updated_at = NOW() WHERE id = ANY($2) RETURNING *',
      [status, poleIds]
    );

    res.json({
      success: true,
      message: `Updated ${result.rows.length} poles`,
      data: {
        count: result.rows.length,
        poles: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/poles/bulk-delete - Soft delete multiple poles
export const bulkDeletePoles = async (req, res, next) => {
  try {
    const { poleIds } = req.body;

    if (!poleIds || !Array.isArray(poleIds) || poleIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'poleIds array is required',
      });
    }

    // Check for active orders
    const activeOrders = await pool.query(
      `SELECT DISTINCT pole_id FROM orders 
       WHERE pole_id = ANY($1) 
       AND status NOT IN ('COMPLETED', 'EXPIRED', 'CANCELLED')`,
      [poleIds]
    );

    if (activeOrders.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete poles with active orders: ${activeOrders.rows.map(r => r.pole_id).join(', ')}`,
      });
    }

    const result = await pool.query(
      'DELETE FROM poles WHERE id = ANY($1) RETURNING id, pole_code',
      [poleIds]
    );

    res.json({
      success: true,
      message: `Deleted ${result.rows.length} poles`,
      data: {
        count: result.rows.length,
        poles: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};
