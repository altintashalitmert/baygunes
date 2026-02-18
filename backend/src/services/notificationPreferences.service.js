import pool from '../utils/prisma.js';

// Get user notification preferences
export const getUserPreferences = async (userId) => {
  const result = await pool.query(
    `SELECT * FROM user_notification_preferences WHERE user_id = $1`,
    [userId]
  );
  
  if (result.rows.length === 0) {
    // Create default preferences
    return await createDefaultPreferences(userId);
  }
  
  return result.rows[0];
};

// Create default notification preferences for user
export const createDefaultPreferences = async (userId) => {
  const result = await pool.query(
    `INSERT INTO user_notification_preferences 
     (user_id, email_enabled, new_order_enabled, status_change_enabled, assignment_enabled, reminder_enabled, created_at, updated_at)
     VALUES ($1, true, true, true, true, true, NOW(), NOW())
     RETURNING *`,
    [userId]
  );
  
  return result.rows[0];
};

// Update notification preferences
export const updatePreferences = async (userId, preferences) => {
  const {
    emailEnabled,
    newOrderEnabled,
    statusChangeEnabled,
    assignmentEnabled,
    reminderEnabled
  } = preferences;
  
  const result = await pool.query(
    `UPDATE user_notification_preferences 
     SET email_enabled = COALESCE($2, email_enabled),
         new_order_enabled = COALESCE($3, new_order_enabled),
         status_change_enabled = COALESCE($4, status_change_enabled),
         assignment_enabled = COALESCE($5, assignment_enabled),
         reminder_enabled = COALESCE($6, reminder_enabled),
         updated_at = NOW()
     WHERE user_id = $1
     RETURNING *`,
    [userId, emailEnabled, newOrderEnabled, statusChangeEnabled, assignmentEnabled, reminderEnabled]
  );
  
  if (result.rows.length === 0) {
    // Create preferences if they don't exist
    const newPrefs = await createDefaultPreferences(userId);
    return await updatePreferences(userId, preferences);
  }
  
  return result.rows[0];
};

// Check if user should receive specific notification type
export const shouldSendNotification = async (userId, type) => {
  const prefs = await getUserPreferences(userId);
  
  if (!prefs.email_enabled) {
    return false;
  }
  
  switch (type) {
    case 'NEW_ORDER':
      return prefs.new_order_enabled;
    case 'STATUS_CHANGE':
      return prefs.status_change_enabled;
    case 'ASSIGNMENT':
      return prefs.assignment_enabled;
    case 'REMINDER':
      return prefs.reminder_enabled;
    default:
      return true;
  }
};

// Toggle all notifications for user
export const toggleAllNotifications = async (userId, enabled) => {
  const result = await pool.query(
    `UPDATE user_notification_preferences 
     SET email_enabled = $2,
         updated_at = NOW()
     WHERE user_id = $1
     RETURNING *`,
    [userId, enabled]
  );
  
  if (result.rows.length === 0) {
    await createDefaultPreferences(userId);
    return await toggleAllNotifications(userId, enabled);
  }
  
  return result.rows[0];
};
