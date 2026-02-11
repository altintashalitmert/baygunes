import pool from '../utils/prisma.js';
import { sendEmail, WORKFLOW_EMAILS } from '../services/email.service.js';
import fs from 'fs';
import path from 'path';

// Helper to log errors to a file
const logDebug = (msg) => {
  const logPath = path.join(process.cwd(), 'backend_error.log');
  fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
};

const ADMIN_ROLES = ['SUPER_ADMIN', 'OPERATOR'];

const normalizeDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const toStartOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getAdminEmails = async (dbClient = pool) => {
  const result = await dbClient.query(
    `SELECT email
     FROM users
     WHERE active = true AND role = ANY($1::user_role[])`,
    [ADMIN_ROLES]
  );
  return result.rows.map((row) => row.email).filter(Boolean);
};

const getUserEmailById = async (dbClient, userId) => {
  if (!userId) return null;
  const result = await dbClient.query(
    `SELECT email FROM users WHERE id = $1 AND active = true LIMIT 1`,
    [userId]
  );
  return result.rows[0]?.email || null;
};

const getNotificationRecipients = async (dbClient, order, newStatus) => {
  const adminEmails = await getAdminEmails(dbClient);

  if (newStatus === 'PRINTING') {
    const printerEmail = await getUserEmailById(dbClient, order.assigned_printer);
    return printerEmail ? [printerEmail] : adminEmails;
  }

  if (newStatus === 'AWAITING_MOUNT' || newStatus === 'EXPIRED') {
    const fieldEmail = await getUserEmailById(dbClient, order.assigned_field);
    return fieldEmail ? [fieldEmail] : adminEmails;
  }

  return adminEmails;
};

const sendNotificationToRecipients = async (recipients, payload) => {
  const uniqueRecipients = [...new Set((recipients || []).filter(Boolean))];
  await Promise.allSettled(
    uniqueRecipients.map((email) => sendEmail({ to: email, ...payload }))
  );
};

const buildAssignmentAuditNote = ({ assignmentType, previousAssigneeId, nextAssigneeId }) => {
  const previous = previousAssigneeId || 'none';
  const next = nextAssigneeId || 'none';
  return `${assignmentType} assignment updated: ${previous} -> ${next}`;
};

const insertAssignmentAudit = async (dbClient, { orderId, status, changedBy, assignmentType, previousAssigneeId, nextAssigneeId }) => {
  await dbClient.query(
    `INSERT INTO workflow_history (order_id, old_status, new_status, changed_by, notes)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      orderId,
      status,
      status,
      changedBy,
      buildAssignmentAuditNote({ assignmentType, previousAssigneeId, nextAssigneeId }),
    ]
  );
};

const ORDER_SELECT_WITH_PROOFS = `
  SELECT
    o.*,
    p.pole_code,
    p.latitude,
    p.longitude,
    p.district,
    p.neighborhood,
    u.name as created_by_name,
    EXISTS (
      SELECT 1
      FROM files f
      WHERE f.order_id = o.id AND f.file_type = 'PROOF_MOUNT'
    ) AS has_mount_proof,
    EXISTS (
      SELECT 1
      FROM files f
      WHERE f.order_id = o.id AND f.file_type = 'PROOF_DISMOUNT'
    ) AS has_dismount_proof,
    (
      SELECT f.file_url
      FROM files f
      WHERE f.order_id = o.id AND f.file_type = 'PROOF_MOUNT'
      ORDER BY f.uploaded_at DESC
      LIMIT 1
    ) AS mount_proof_url,
    (
      SELECT f.file_url
      FROM files f
      WHERE f.order_id = o.id AND f.file_type = 'PROOF_DISMOUNT'
      ORDER BY f.uploaded_at DESC
      LIMIT 1
    ) AS dismount_proof_url
  FROM orders o
  JOIN poles p ON o.pole_id = p.id
  JOIN users u ON o.created_by = u.id
`;

const validateDateRange = (startDate, endDate) => {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  if (!start || !end) {
    return { valid: false, error: 'Invalid startDate or endDate' };
  }

  const normalizedStart = toStartOfDay(start);
  const normalizedEnd = toStartOfDay(end);
  const today = toStartOfDay(new Date());

  if (normalizedStart < today) {
    return { valid: false, error: 'startDate cannot be in the past' };
  }
  if (normalizedEnd <= normalizedStart) {
    return { valid: false, error: 'endDate must be after startDate' };
  }
  return { valid: true, start: normalizedStart, end: normalizedEnd };
};


// POST /api/orders - Create new order
export const createOrder = async (req, res, next) => {
  try {
    logDebug('Starting createOrder request');
    const { poleId, poleIds, accountId, clientName, clientContact, startDate, endDate, price } = req.body;

    logDebug(`Payload: ${JSON.stringify(req.body)}`);

    // Determine target poles: either single 'poleId' or array 'poleIds'
    let targetPoleIds = [];
    if (poleIds && Array.isArray(poleIds) && poleIds.length > 0) {
       targetPoleIds = poleIds;
    } else if (poleId) {
       targetPoleIds = [poleId];
    }

    if (targetPoleIds.length === 0) {
       return res.status(400).json({ success: false, error: 'No poles selected' });
    }

    // Validation
    if (!accountId || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Missing required fields: accountId, startDate, endDate' });
    }

    const dateValidation = validateDateRange(startDate, endDate);
    if (!dateValidation.valid) {
      return res.status(400).json({ success: false, error: dateValidation.error });
    }
    const { start, end } = dateValidation;
    
    // Transaction for bulk creation
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const createdOrders = [];
      
      // Fetch account details to fill client_name if needed
      let fetchedClientName = clientName;
      if(!fetchedClientName) {
        const accRes = await client.query('SELECT company_name, contact_name FROM accounts WHERE id = $1', [accountId]);
        if(accRes.rows.length > 0) {
            fetchedClientName = accRes.rows[0].company_name || accRes.rows[0].contact_name;
        }
      }

      for (const pId of targetPoleIds) {
        // Overlap Check per pole
        const overlapResult = await client.query(
          `SELECT id FROM orders 
           WHERE pole_id = $1 
           AND status NOT IN ('COMPLETED', 'EXPIRED', 'CANCELLED')
           AND (
             (start_date <= $2 AND end_date >= $2) OR
             (start_date <= $3 AND end_date >= $3) OR
             (start_date >= $2 AND end_date <= $3)
           )`,
          [pId, start, end]
        );

        if (overlapResult.rows.length > 0) {
            const error = new Error(`Seçilen direklerden biri (${pId}) bu tarihlerde dolu.`);
            error.statusCode = 409;
            throw error;
        }


        // Determine Initial Status
        // If start date is in the future (> today), set as SCHEDULED
        // Otherwise PENDING (Immediate start)
        const today = new Date();
        today.setHours(0,0,0,0);
        let initialStatus = 'PENDING';
        if (start > today) {
            initialStatus = 'SCHEDULED';
        }

        // Insert
        const orderRes = await client.query(
            `INSERT INTO orders (
              pole_id, account_id, client_name, client_contact, start_date, end_date, 
              status, created_by, price, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) 
            RETURNING *`,
            [pId, accountId, fetchedClientName || 'Unknown', clientContact || '', start, end, initialStatus, req.user.id, price || 0]
        );

        // Update Pole

        // Update Pole Status only if it's starting immediately (PENDING)
        // If SCHEDULED, pole remains as is until date comes (handled by daily cron job later)
        if (initialStatus !== 'SCHEDULED') {
             await client.query(`UPDATE poles SET status = 'OCCUPIED', updated_at = NOW() WHERE id = $1`, [pId]);
        }
        
        createdOrders.push(orderRes.rows[0]);
      }
      
      await client.query('COMMIT');


      res.status(201).json({
        success: true,
        data: { orders: createdOrders, count: createdOrders.length }
      });

      // Send Notification (Async, don't block response)
      try {
        const orderForMail = { 
           ...createdOrders[0], 
           pole_code: 'Toplu İşlem', // Or fetch actual pole code if needed
           start_date: start,
           end_date: end 
        };
        const emailContent = WORKFLOW_EMAILS.CREATED(orderForMail);
        const recipients = await getAdminEmails(pool);
        sendNotificationToRecipients(recipients, emailContent).catch(err => {
          console.error('Create Order Email failed:', err);
        });
      } catch (e) { console.error('Email prep failed:', e); }

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    logDebug(`Controller error: ${error.message}`);
    next(error);
  }
};


// GET /api/orders/:id - Get order by ID
export const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    
    if (!id || id === 'undefined') {
       return res.status(400).json({ success: false, error: 'Invalid Order ID' }); 
    }

    const result = await pool.query(
      `${ORDER_SELECT_WITH_PROOFS}
       WHERE o.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }
    const order = result.rows[0];

    if (user.role === 'PRINTER' && order.assigned_printer !== user.id) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    if (user.role === 'FIELD' && order.assigned_field !== user.id) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    res.json({
      success: true,
      data: {
        order,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/orders - List orders (with filters)
export const getOrders = async (req, res, next) => {
  try {
    const { status, poleId } = req.query;
    const user = req.user;
    let query = `${ORDER_SELECT_WITH_PROOFS} WHERE 1=1`;
    const params = [];
    let paramCount = 1;

    if (user.role === 'PRINTER') {
      query += ` AND o.assigned_printer = $${paramCount++}`;
      params.push(user.id);
      query += ` AND o.status IN ('PENDING', 'PRINTING', 'AWAITING_MOUNT')`;
    } else if (user.role === 'FIELD') {
      query += ` AND o.assigned_field = $${paramCount++}`;
      params.push(user.id);
      query += ` AND o.status IN ('AWAITING_MOUNT', 'EXPIRED', 'LIVE')`;
    }

    if (status) {
      query += ` AND o.status = $${paramCount++}`;
      params.push(status);
    }

    if (poleId) {
      query += ` AND o.pole_id = $${paramCount++}`;
      params.push(poleId);
    }

    query += ` ORDER BY o.created_at DESC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: {
        orders: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/orders/:id/status - Update order status (transition)
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newStatus, notes } = req.body;
    const user = req.user;

    if (!newStatus) {
      return res.status(400).json({ success: false, error: 'newStatus is required' });
    }

    // 1. Get current order
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    const order = orderResult.rows[0];

    if (user.role === 'PRINTER' && order.assigned_printer !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'You are not assigned to this order as printer',
      });
    }

    if (user.role === 'FIELD' && order.assigned_field !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'You are not assigned to this order as field team',
      });
    }

    // 2. Validate Transition
    const { validateTransition } = await import('../services/workflow.service.js');
    const validation = validateTransition(order.status, newStatus, user);

    if (!validation.allowed) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    if (order.status === 'PENDING' && newStatus === 'PRINTING' && !order.assigned_printer) {
      return res.status(400).json({
        success: false,
        error: 'assigned_printer is required before moving to PRINTING',
      });
    }

    if (order.status === 'PRINTING' && newStatus === 'AWAITING_MOUNT' && !order.assigned_field) {
      return res.status(400).json({
        success: false,
        error: 'assigned_field is required before moving to AWAITING_MOUNT',
      });
    }

    if (order.status === 'AWAITING_MOUNT' && newStatus === 'LIVE') {
      const proofResult = await pool.query(
        `SELECT id FROM files WHERE order_id = $1 AND file_type = 'PROOF_MOUNT' LIMIT 1`,
        [id]
      );
      if (proofResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Mount proof photo is required before moving to LIVE',
        });
      }
    }

    if (order.status === 'EXPIRED' && newStatus === 'COMPLETED') {
      const proofResult = await pool.query(
        `SELECT id FROM files WHERE order_id = $1 AND file_type = 'PROOF_DISMOUNT' LIMIT 1`,
        [id]
      );
      if (proofResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Dismount proof photo is required before moving to COMPLETED',
        });
      }
    }

    // 3. Update Status Transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update Order
      const updatedOrderResult = await client.query(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [newStatus, id]
      );

      // Record History
      await client.query(
        'INSERT INTO workflow_history (order_id, old_status, new_status, changed_by, notes) VALUES ($1, $2, $3, $4, $5)',
        [id, order.status, newStatus, user.id, notes || null]
      );

      // Side Effects
      if (['COMPLETED', 'CANCELLED'].includes(newStatus)) {
        await client.query(
           `UPDATE poles SET status = 'AVAILABLE', updated_at = NOW() WHERE id = $1`,
           [order.pole_id]
        );
      }
      
      await client.query('COMMIT');

      // Send Notification
      try {
        const emailContent = WORKFLOW_EMAILS.STATUS_CHANGE(order, order.status, newStatus);
        const recipients = await getNotificationRecipients(pool, order, newStatus);

        sendNotificationToRecipients(recipients, emailContent).catch(err => {
          console.error('Email send failed:', err);
        });
      } catch (e) { console.error('Email prep failed:', e); }

      res.json({
        success: true,
        data: {
          order: updatedOrderResult.rows[0],
          message: `Status updated from ${order.status} to ${newStatus}`
        }
      });

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

// POST /api/orders/:id/upload
export const uploadOrderFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    if (!['contract', 'image', 'proof'].includes(file.fieldname)) {
      return res.status(400).json({ success: false, error: 'Invalid file field' });
    }

    if (file.fieldname === 'contract' && file.size > 10 * 1024 * 1024) {
      fs.unlinkSync(file.path);
      return res.status(400).json({
        success: false,
        error: 'Contract file size cannot exceed 10 MB',
      });
    }

    const folderByField = {
      contract: 'contracts',
      image: 'images',
      proof: 'proofs',
    };
    const filePath = `/uploads/${folderByField[file.fieldname]}/${file.filename}`;

    let result;

    if (file.fieldname === 'proof') {
      const orderResult = await pool.query('SELECT id, status FROM orders WHERE id = $1 LIMIT 1', [id]);
      if (orderResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      const order = orderResult.rows[0];
      let proofType = null;
      if (order.status === 'AWAITING_MOUNT') proofType = 'PROOF_MOUNT';
      if (order.status === 'EXPIRED') proofType = 'PROOF_DISMOUNT';

      if (!proofType) {
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkError) {
          console.error('Failed to remove invalid proof file:', unlinkError.message);
        }
        return res.status(400).json({
          success: false,
          error: 'Proof upload is only allowed in AWAITING_MOUNT or EXPIRED status',
        });
      }

      await pool.query(
        `INSERT INTO files (order_id, file_type, file_url, original_name, file_size, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, proofType, filePath, file.originalname, file.size, req.user.id]
      );
      result = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    } else {
      const dbField = file.fieldname === 'contract' ? 'contract_file_url' : 'ad_image_url';
      result = await pool.query(
        `UPDATE orders SET ${dbField} = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [filePath, id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.json({
      success: true,
      data: {
        file: filePath,
        order: result.rows[0]
      }
    });

  } catch (error) {
    next(error);
  }
};

// PATCH /api/orders/:id/assign-printer
export const assignPrinter = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { printerId } = req.body;

    if (!printerId) {
      return res.status(400).json({ success: false, error: 'printerId is required' });
    }

    const printerResult = await pool.query(
      `SELECT id FROM users WHERE id = $1 AND role = 'PRINTER' AND active = true LIMIT 1`,
      [printerId]
    );
    if (printerResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Printer user not found' });
    }

    const client = await pool.connect();
    let orderResult;
    let previousAssigneeId = null;
    try {
      await client.query('BEGIN');

      const existingOrderResult = await client.query(
        `SELECT *
         FROM orders
         WHERE id = $1
         LIMIT 1
         FOR UPDATE`,
        [id]
      );

      if (existingOrderResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      const existingOrder = existingOrderResult.rows[0];
      previousAssigneeId = existingOrder.assigned_printer;

      if (previousAssigneeId === printerId) {
        await client.query('ROLLBACK');
        return res.json({
          success: true,
          data: {
            order: existingOrder,
            message: 'Printer is already assigned to this order',
          },
        });
      }

      orderResult = await client.query(
        `UPDATE orders
         SET assigned_printer = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [printerId, id]
      );

      await insertAssignmentAudit(client, {
        orderId: id,
        status: existingOrder.status,
        changedBy: req.user.id,
        assignmentType: 'printer',
        previousAssigneeId,
        nextAssigneeId: printerId,
      });

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({
      success: true,
      data: {
        order: orderResult.rows[0],
        message: 'Printer assigned successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/orders/:id/assign-field
export const assignFieldTeam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fieldId } = req.body;

    if (!fieldId) {
      return res.status(400).json({ success: false, error: 'fieldId is required' });
    }

    const fieldResult = await pool.query(
      `SELECT id FROM users WHERE id = $1 AND role = 'FIELD' AND active = true LIMIT 1`,
      [fieldId]
    );
    if (fieldResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Field user not found' });
    }

    const client = await pool.connect();
    let orderResult;
    let previousAssigneeId = null;
    try {
      await client.query('BEGIN');

      const existingOrderResult = await client.query(
        `SELECT *
         FROM orders
         WHERE id = $1
         LIMIT 1
         FOR UPDATE`,
        [id]
      );

      if (existingOrderResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      const existingOrder = existingOrderResult.rows[0];
      previousAssigneeId = existingOrder.assigned_field;

      if (previousAssigneeId === fieldId) {
        await client.query('ROLLBACK');
        return res.json({
          success: true,
          data: {
            order: existingOrder,
            message: 'Field user is already assigned to this order',
          },
        });
      }

      orderResult = await client.query(
        `UPDATE orders
         SET assigned_field = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [fieldId, id]
      );

      await insertAssignmentAudit(client, {
        orderId: id,
        status: existingOrder.status,
        changedBy: req.user.id,
        assignmentType: 'field',
        previousAssigneeId,
        nextAssigneeId: fieldId,
      });

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({
      success: true,
      data: {
        order: orderResult.rows[0],
        message: 'Field team assigned successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/orders/my-tasks
export const getMyTasks = async (req, res, next) => {
  try {
    const user = req.user;
    let query = `${ORDER_SELECT_WITH_PROOFS} WHERE 1=1`;
    const params = [];
    let paramCount = 1;

    if (user.role === 'PRINTER') {
      query += ` AND o.assigned_printer = $${paramCount++}`;
      params.push(user.id);
    } else if (user.role === 'FIELD') {
      query += ` AND o.assigned_field = $${paramCount++}`;
      params.push(user.id);
    } else {
      return res.status(403).json({
        success: false,
        error: 'Only PRINTER and FIELD users can access my tasks',
      });
    }

    query += ` ORDER BY o.updated_at DESC`;
    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: { orders: result.rows },
    });
  } catch (error) {
    next(error);
  }
};
