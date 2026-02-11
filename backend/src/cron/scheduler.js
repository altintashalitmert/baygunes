
import cron from 'node-cron';
import pool from '../utils/prisma.js';
import { sendEmail } from '../services/email.service.js';

const ADMIN_ROLES = ['SUPER_ADMIN', 'OPERATOR'];

const getAdminEmails = async (dbClient) => {
  const result = await dbClient.query(
    `SELECT email
     FROM users
     WHERE active = true AND role = ANY($1::user_role[])`,
    [ADMIN_ROLES]
  );
  return result.rows.map((row) => row.email).filter(Boolean);
};

const runDailyJobs = async () => {
  console.log('⏰ Running Daily Scheduler Jobs...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const adminEmails = await getAdminEmails(client);

    // 1. Activate Scheduled Orders (SCHEDULED -> PENDING)
    // Find orders starting today (or earlier if missed) which are SCHEDULED
    const today = new Date();
    today.setHours(0,0,0,0);

    const startingOrders = await client.query(
      `UPDATE orders 
       SET status = 'PENDING', updated_at = NOW() 
       WHERE status = 'SCHEDULED' AND start_date <= NOW() 
       RETURNING id, client_name, pole_id`
    );

    if (startingOrders.rows.length > 0) {
      console.log(`🚀 Activating ${startingOrders.rows.length} scheduled orders.`);
      
      // Update those poles to OCCUPIED
      for (const order of startingOrders.rows) {
         await client.query(`UPDATE poles SET status = 'OCCUPIED' WHERE id = $1`, [order.pole_id]);
         
         await Promise.allSettled(
           adminEmails.map((email) =>
             sendEmail({
               to: email,
               subject: `Planlı Sipariş Aktifleşti: ${order.client_name}`,
               html: `<p>Sipariş (#${order.id.split('-')[0]}) bugün otomatik olarak PENDING (Beklemede) moduna alındı. Baskı onayı verebilirsiniz.</p>`,
             })
           )
         );
      }
    }

    // 2. Expire Ending Orders (LIVE -> EXPIRED)
    // Actually, usually operators manually confirm removal, but we can flag them or auto-expire.
    // Let's Auto-Expire only if end_date was yesterday.
    // If end_date < NOW(), they are technically expired.
    
    const expiringOrders = await client.query(
        `UPDATE orders 
         SET status = 'EXPIRED', updated_at = NOW()
         WHERE status = 'LIVE' AND end_date < NOW()::date
         RETURNING id, client_name, pole_id, assigned_field`
    );

    if (expiringOrders.rows.length > 0) {
       console.log(`🛑 Expiring ${expiringOrders.rows.length} orders.`);
       // Note: We don't free the pole instantly here usually, field team must confirm removal. 
       // But if we want auto-freedom:
       // await client.query(`UPDATE poles SET status = 'AVAILABLE' WHERE id = $1`, [pole_id]);
       // Let's KEEP pole as OCCUPIED until Field Team marks "Removed/Completed".
       // Just notify field team
       for (const order of expiringOrders.rows) {
          let recipients = adminEmails;
          if (order.assigned_field) {
            const assignedFieldResult = await client.query(
              `SELECT email FROM users WHERE id = $1 AND active = true LIMIT 1`,
              [order.assigned_field]
            );
            if (assignedFieldResult.rows[0]?.email) {
              recipients = [assignedFieldResult.rows[0].email];
            }
          }

          await Promise.allSettled(
            recipients.map((email) =>
              sendEmail({
                to: email,
                subject: `Süre Doldu: ${order.client_name} (Sökülmesi Gerek)`,
                html: `<p>Sipariş (#${order.id.split('-')[0]}) süresi doldu. Lütfen söküm işlemini planlayın.</p>`,
              })
            )
          );
       }
    }

    await client.query('COMMIT');
    console.log('✅ Daily Jobs Completed.');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Daily Job Error:', error);
  } finally {
    client.release();
  }
};

// Init Cron
export const initScheduler = () => {
    // Run every day at 00:01
    cron.schedule('1 0 * * *', runDailyJobs);
    
    // Also run once on startup for dev/test (optional, maybe too aggressive for restarting dev server)
    // setTimeout(runDailyJobs, 5000); 
    console.log('📅 Scheduler initialized (00:01 Daily)');
};
