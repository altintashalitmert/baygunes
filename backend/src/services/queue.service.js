import Queue from 'bull';
import pool from '../utils/prisma.js';
import { sendEmail } from './email.service.js';

// Create queues
const emailQueue = new Queue('email notifications', process.env.REDIS_URL || 'redis://localhost:6379');
const notificationLogQueue = new Queue('notification logs', process.env.REDIS_URL || 'redis://localhost:6379');

// Email queue processor
emailQueue.process(async (job) => {
  const { to, subject, html, userId, orderId, template } = job.data;
  
  try {
    // Check user notification preferences
    if (userId) {
      const prefsResult = await pool.query(
        `SELECT email_enabled FROM user_notification_preferences WHERE user_id = $1`,
        [userId]
      );
      
      if (prefsResult.rows.length > 0 && !prefsResult.rows[0].email_enabled) {
        console.log(`📧 Email skipped for user ${userId} - preferences disabled`);
        return { success: false, reason: 'User preferences disabled' };
      }
    }
    
    // Send email
    const result = await sendEmail({ to, subject, html });
    
    // Log successful notification
    await logNotification({
      userId,
      orderId,
      type: 'EMAIL',
      template,
      subject,
      content: html,
      status: 'SENT',
      retryCount: job.attemptsMade || 0
    });
    
    return { success: true, result };
  } catch (error) {
    console.error('❌ Email queue processing failed:', error);
    
    // Log failed notification
    await logNotification({
      userId,
      orderId,
      type: 'EMAIL',
      template,
      subject,
      content: html,
      status: 'FAILED',
      errorMessage: error.message,
      retryCount: job.attemptsMade || 0
    });
    
    throw error; // Trigger retry
  }
});

// Log notification to database
const logNotification = async ({
  userId,
  orderId,
  type,
  template,
  subject,
  content,
  status,
  errorMessage = null,
  retryCount = 0
}) => {
  try {
    await pool.query(
      `INSERT INTO notification_logs 
       (user_id, order_id, type, template, subject, content, status, error_message, retry_count, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [userId, orderId, type, template, subject, content, status, errorMessage, retryCount]
    );
  } catch (error) {
    console.error('Failed to log notification:', error);
  }
};

// Add email to queue with retry
export const queueEmail = async ({ to, subject, html, userId = null, orderId = null, template = 'default' }) => {
  try {
    const job = await emailQueue.add(
      { to, subject, html, userId, orderId, template },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000 // 5 seconds, then 10, then 20
        },
        removeOnComplete: true,
        removeOnFail: false
      }
    );
    
    console.log(`📧 Email queued (Job ID: ${job.id})`);
    return job;
  } catch (error) {
    console.error('❌ Failed to queue email:', error);
    throw error;
  }
};

// Get notification logs
export const getNotificationLogs = async (filters = {}) => {
  const { userId, status, startDate, endDate, limit = 100 } = filters;
  
  let query = `
    SELECT nl.*, u.name as user_name, u.email as user_email
    FROM notification_logs nl
    LEFT JOIN users u ON u.id = nl.user_id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 1;
  
  if (userId) {
    query += ` AND nl.user_id = $${paramCount++}`;
    params.push(userId);
  }
  
  if (status) {
    query += ` AND nl.status = $${paramCount++}`;
    params.push(status);
  }
  
  if (startDate) {
    query += ` AND nl.created_at >= $${paramCount++}`;
    params.push(startDate);
  }
  
  if (endDate) {
    query += ` AND nl.created_at <= $${paramCount++}`;
    params.push(endDate);
  }
  
  query += ` ORDER BY nl.created_at DESC LIMIT $${paramCount++}`;
  params.push(limit);
  
  const result = await pool.query(query, params);
  return result.rows;
};

// Get failed notifications for retry
export const getFailedNotifications = async () => {
  const result = await pool.query(
    `SELECT * FROM notification_logs 
     WHERE status = 'FAILED' 
     AND retry_count < 3
     AND created_at > NOW() - INTERVAL '24 hours'
     ORDER BY created_at ASC`
  );
  return result.rows;
};

// Retry failed notification
export const retryNotification = async (logId) => {
  const result = await pool.query(
    `SELECT * FROM notification_logs WHERE id = $1`,
    [logId]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Notification log not found');
  }
  
  const log = result.rows[0];
  
  // Re-queue the email
  await queueEmail({
    to: log.user_email,
    subject: log.subject,
    html: log.content,
    userId: log.user_id,
    orderId: log.order_id,
    template: log.template
  });
  
  // Update retry count
  await pool.query(
    `UPDATE notification_logs SET retry_count = retry_count + 1 WHERE id = $1`,
    [logId]
  );
};

// Queue event handlers
emailQueue.on('completed', (job, result) => {
  console.log(`✅ Email job ${job.id} completed`);
});

emailQueue.on('failed', (job, err) => {
  console.error(`❌ Email job ${job.id} failed:`, err.message);
});

export { emailQueue };
