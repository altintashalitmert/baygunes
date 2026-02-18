import pool from '../utils/prisma.js';

// Soft delete a pole
export const softDeletePole = async (poleId, deletedBy = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if pole has active orders
    const activeOrders = await client.query(
      `SELECT id FROM orders 
       WHERE pole_id = $1 
       AND status NOT IN ('COMPLETED', 'CANCELLED', 'EXPIRED')`,
      [poleId]
    );
    
    if (activeOrders.rows.length > 0) {
      throw new Error('Cannot delete pole with active orders');
    }
    
    // Soft delete the pole
    await client.query(
      `UPDATE poles 
       SET deleted_at = NOW(), 
           status = 'INACTIVE',
           updated_at = NOW()
       WHERE id = $1`,
      [poleId]
    );
    
    await client.query('COMMIT');
    return { success: true, message: 'Pole soft deleted successfully' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Restore a soft-deleted pole
export const restorePole = async (poleId) => {
  const result = await pool.query(
    `UPDATE poles 
     SET deleted_at = NULL, 
         status = 'AVAILABLE',
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [poleId]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Pole not found');
  }
  
  return { success: true, pole: result.rows[0] };
};

// Get poles (excluding soft-deleted by default)
export const getPoles = async (includeDeleted = false) => {
  let query = `
    SELECT p.*, 
           COUNT(o.id) as total_orders
    FROM poles p
    LEFT JOIN orders o ON o.pole_id = p.id
  `;
  
  if (!includeDeleted) {
    query += ` WHERE p.deleted_at IS NULL`;
  }
  
  query += ` GROUP BY p.id ORDER BY p.pole_code`;
  
  const result = await pool.query(query);
  return result.rows;
};

// Soft delete an order (effectively same as cancel)
export const softDeleteOrder = async (orderId, deletedBy, reason = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const orderResult = await client.query(
      `SELECT * FROM orders WHERE id = $1`,
      [orderId]
    );
    
    if (orderResult.rows.length === 0) {
      throw new Error('Order not found');
    }
    
    const order = orderResult.rows[0];
    
    // Only allow deletion of PENDING or SCHEDULED orders
    if (!['PENDING', 'SCHEDULED'].includes(order.status)) {
      throw new Error(`Cannot delete order in ${order.status} status`);
    }
    
    // Soft delete by marking as CANCELLED
    await client.query(
      `UPDATE orders 
       SET status = 'CANCELLED',
           cancelled_at = NOW(),
           cancelled_by = $1,
           cancellation_reason = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [deletedBy, reason, orderId]
    );
    
    // Log in workflow history
    await client.query(
      `INSERT INTO workflow_history (order_id, old_status, new_status, changed_by, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [orderId, order.status, 'CANCELLED', deletedBy, `Order deleted: ${reason || 'No reason provided'}`]
    );
    
    // Free up the pole
    await client.query(
      `UPDATE poles SET status = 'AVAILABLE', updated_at = NOW() WHERE id = $1`,
      [order.pole_id]
    );
    
    await client.query('COMMIT');
    return { success: true, message: 'Order soft deleted successfully' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Soft delete a file
export const softDeleteFile = async (fileId) => {
  const result = await pool.query(
    `UPDATE files 
     SET deleted_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [fileId]
  );
  
  if (result.rows.length === 0) {
    throw new Error('File not found');
  }
  
  return { success: true, file: result.rows[0] };
};

// Middleware to exclude soft-deleted records
export const excludeSoftDeleted = (tableAlias = 't') => {
  return `${tableAlias}.deleted_at IS NULL`;
};
