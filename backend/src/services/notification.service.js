import Queue from 'bull';
import pool from '../utils/prisma.js';
import { sendEmail } from './email.service.js';
import emailTemplates from './emailTemplates.service.js';

// Redis configuration
const redisConfig = {
  redis: process.env.REDIS_URL || {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined
  }
};

// Create notification queue
const notificationQueue = new Queue('email-notifications', redisConfig);

// Process jobs
notificationQueue.process(async (job) => {
  const { type, data } = job.data;
  
  console.log(`📧 Processing notification job: ${type}`, job.id);
  
  try {
    switch (type) {
      case 'NEW_ORDER':
        await sendNewOrderNotification(data);
        break;
      case 'PRINTER_ASSIGNED':
        await sendPrinterAssignmentNotification(data);
        break;
      case 'FIELD_ASSIGNED':
        await sendFieldAssignmentNotification(data);
        break;
      case 'STATUS_CHANGED':
        await sendStatusChangeNotification(data);
        break;
      case 'DAILY_SUMMARY':
        await sendDailySummaryNotification(data);
        break;
      default:
        throw new Error(`Unknown notification type: ${type}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error(`❌ Notification job failed: ${type}`, error);
    throw error;
  }
});

// Queue event handlers
notificationQueue.on('completed', (job, result) => {
  console.log(`✅ Notification job completed: ${job.id}`);
});

notificationQueue.on('failed', (job, err) => {
  console.error(`❌ Notification job failed: ${job.id}`, err.message);
});

// 1. New Order Notification
async function sendNewOrderNotification(data) {
  const { orderId } = data;
  
  // Get order details
  const orderResult = await pool.query(
    `SELECT o.*, p.pole_code, p.district, p.neighborhood, u.name as creator_name
     FROM orders o
     JOIN poles p ON o.pole_id = p.id
     JOIN users u ON o.created_by = u.id
     WHERE o.id = $1`,
    [orderId]
  );
  
  if (orderResult.rows.length === 0) return;
  const order = orderResult.rows[0];
  
  // Get admin emails
  const adminResult = await pool.query(
    `SELECT email, name FROM users 
     WHERE role = 'SUPER_ADMIN' AND active = true AND email_notifications = true`
  );
  
  const template = emailTemplates.newOrder(order, order, order.creator_name);
  
  // Send to all admins
  for (const admin of adminResult.rows) {
    try {
      await sendEmail({
        to: admin.email,
        subject: template.subject,
        html: template.html
      });
      
      // Log notification
      await logNotification({
        userId: admin.id,
        orderId,
        type: 'EMAIL',
        template: 'NEW_ORDER',
        subject: template.subject,
        status: 'SENT'
      });
    } catch (error) {
      console.error(`Failed to send email to ${admin.email}:`, error);
    }
  }
}

// 2. Printer Assignment Notification
async function sendPrinterAssignmentNotification(data) {
  const { orderId, printerId } = data;
  
  // Get details
  const [orderResult, printerResult] = await Promise.all([
    pool.query(
      `SELECT o.*, p.pole_code, p.district, p.neighborhood 
       FROM orders o JOIN poles p ON o.pole_id = p.id WHERE o.id = $1`,
      [orderId]
    ),
    pool.query('SELECT * FROM users WHERE id = $1', [printerId])
  ]);
  
  if (orderResult.rows.length === 0 || printerResult.rows.length === 0) return;
  
  const order = orderResult.rows[0];
  const printer = printerResult.rows[0];
  
  // Check user preferences
  const prefsResult = await pool.query(
    'SELECT email_enabled FROM user_notification_preferences WHERE user_id = $1',
    [printerId]
  );
  
  if (prefsResult.rows.length > 0 && !prefsResult.rows[0].email_enabled) {
    console.log(`Email notifications disabled for user ${printerId}`);
    return;
  }
  
  const template = emailTemplates.printerAssigned(order, order, printer, 'Sistem');
  
  await sendEmail({
    to: printer.email,
    subject: template.subject,
    html: template.html
  });
  
  await logNotification({
    userId: printerId,
    orderId,
    type: 'EMAIL',
    template: 'PRINTER_ASSIGNED',
    subject: template.subject,
    status: 'SENT'
  });
}

// 3. Field Team Assignment Notification
async function sendFieldAssignmentNotification(data) {
  const { orderId, fieldId, isMount = true } = data;
  
  const [orderResult, fieldResult] = await Promise.all([
    pool.query(
      `SELECT o.*, p.pole_code, p.district, p.neighborhood, p.city, p.street, 
              p.latitude, p.longitude
       FROM orders o JOIN poles p ON o.pole_id = p.id WHERE o.id = $1`,
      [orderId]
    ),
    pool.query('SELECT * FROM users WHERE id = $1', [fieldId])
  ]);
  
  if (orderResult.rows.length === 0 || fieldResult.rows.length === 0) return;
  
  const order = orderResult.rows[0];
  const fieldUser = fieldResult.rows[0];
  
  // Check preferences
  const prefsResult = await pool.query(
    'SELECT assignment_enabled FROM user_notification_preferences WHERE user_id = $1',
    [fieldId]
  );
  
  if (prefsResult.rows.length > 0 && !prefsResult.rows[0].assignment_enabled) {
    return;
  }
  
  const template = emailTemplates.fieldAssigned(order, order, fieldUser, 'Sistem', isMount);
  
  await sendEmail({
    to: fieldUser.email,
    subject: template.subject,
    html: template.html
  });
  
  await logNotification({
    userId: fieldId,
    orderId,
    type: 'EMAIL',
    template: 'FIELD_ASSIGNED',
    subject: template.subject,
    status: 'SENT'
  });
}

// 4. Status Change Notification
async function sendStatusChangeNotification(data) {
  const { orderId, oldStatus, newStatus, changedById } = data;
  
  const [orderResult, changerResult] = await Promise.all([
    pool.query(
      `SELECT o.*, p.pole_code FROM orders o JOIN poles p ON o.pole_id = p.id WHERE o.id = $1`,
      [orderId]
    ),
    pool.query('SELECT name FROM users WHERE id = $1', [changedById])
  ]);
  
  if (orderResult.rows.length === 0) return;
  
  const order = orderResult.rows[0];
  const changedBy = changerResult.rows[0]?.name || 'Sistem';
  
  // Determine recipients based on status
  let recipients = [];
  
  // Always notify admin
  const adminResult = await pool.query(
    `SELECT email FROM users WHERE role = 'SUPER_ADMIN' AND active = true`
  );
  recipients.push(...adminResult.rows.map(r => r.email));
  
  // Notify assigned printer/field based on status
  if (['PRINTING', 'AWAITING_MOUNT'].includes(newStatus) && order.assigned_printer) {
    const printerResult = await pool.query('SELECT email FROM users WHERE id = $1', [order.assigned_printer]);
    if (printerResult.rows.length > 0) recipients.push(printerResult.rows[0].email);
  }
  
  if (['AWAITING_MOUNT', 'EXPIRED'].includes(newStatus) && order.assigned_field) {
    const fieldResult = await pool.query('SELECT email FROM users WHERE id = $1', [order.assigned_field]);
    if (fieldResult.rows.length > 0) recipients.push(fieldResult.rows[0].email);
  }
  
  // Remove duplicates
  recipients = [...new Set(recipients)];
  
  const template = emailTemplates.statusChanged(order, order, oldStatus, newStatus, changedBy);
  
  for (const email of recipients) {
    try {
      await sendEmail({
        to: email,
        subject: template.subject,
        html: template.html
      });
    } catch (error) {
      console.error(`Failed to send status change email to ${email}:`, error);
    }
  }
}

// 5. Daily Summary Notification
async function sendDailySummaryNotification(data) {
  const { date, stats } = data;
  
  const template = emailTemplates.dailySummary(stats, date);
  
  const adminResult = await pool.query(
    `SELECT email FROM users WHERE role = 'SUPER_ADMIN' AND active = true`
  );
  
  for (const admin of adminResult.rows) {
    try {
      await sendEmail({
        to: admin.email,
        subject: template.subject,
        html: template.html
      });
    } catch (error) {
      console.error(`Failed to send daily summary to ${admin.email}:`, error);
    }
  }
}

// Helper: Log notification to database
async function logNotification({ userId, orderId, type, template, subject, status, errorMessage = null }) {
  try {
    await pool.query(
      `INSERT INTO notification_logs 
       (user_id, order_id, type, template, subject, status, error_message, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [userId, orderId, type, template, subject, status, errorMessage]
    );
  } catch (error) {
    console.error('Failed to log notification:', error);
  }
}

// Queue wrapper functions
export const queueNotification = async (type, data, options = {}) => {
  try {
    const job = await notificationQueue.add(type, { type, data }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      },
      removeOnComplete: true,
      ...options
    });
    
    console.log(`📧 Notification queued: ${type} (Job ID: ${job.id})`);
    return job;
  } catch (error) {
    console.error('Failed to queue notification:', error);
    throw error;
  }
};

// Specific queue functions
export const notifyNewOrder = (orderId) => queueNotification('NEW_ORDER', { orderId });
export const notifyPrinterAssigned = (orderId, printerId) => queueNotification('PRINTER_ASSIGNED', { orderId, printerId });
export const notifyFieldAssigned = (orderId, fieldId, isMount) => queueNotification('FIELD_ASSIGNED', { orderId, fieldId, isMount });
export const notifyStatusChange = (orderId, oldStatus, newStatus, changedById) => 
  queueNotification('STATUS_CHANGED', { orderId, oldStatus, newStatus, changedById });
export const notifyDailySummary = (date, stats) => queueNotification('DAILY_SUMMARY', { date, stats });

export default {
  queueNotification,
  notifyNewOrder,
  notifyPrinterAssigned,
  notifyFieldAssigned,
  notifyStatusChange,
  notifyDailySummary,
  notificationQueue
};
