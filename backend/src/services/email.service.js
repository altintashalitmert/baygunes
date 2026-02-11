
import pool from '../utils/prisma.js';
import nodemailer from 'nodemailer';

// Helper: Get Config from DB
const getConfig = async (provider) => {
  const result = await pool.query('SELECT * FROM notification_settings WHERE provider = $1', [provider]);
  return result.rows[0];
};

// 1. Send Email (Dynamic Config)
export const sendEmail = async ({ to, subject, html }) => {
  try {
    const settings = await getConfig('SMTP');
    
    // Safety Check: If inactive?
    if (!settings || !settings.is_active) {
      console.log('⚠️ SMTP is inactive. Skipping email.');
      return false;
    }

    const config = settings.config;
    let transporter;

    if (settings.is_demo) {
        // Ethereal (Demo)
        // If config is empty/dummy, create new test account on fly (only once per runtime usually better, but for now ok)
        // For stability, we stick to what's in DB or Env. 
        // If DB has 'demo' user, we assume we need to use a real test service or fallback.
        // Let's use hardcoded ethereal for pure demo if credentials are missing
        if(config.user === 'demo') {
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: "smtp.ethereal.email",
                port: 587,
                secure: false,
                auth: { user: testAccount.user, pass: testAccount.pass },
            });
            console.log('🧪 Using Ethereal Demo Mailer');
        } else {
             transporter = nodemailer.createTransport({
                host: config.host,
                port: config.port,
                secure: config.port === 465,
                auth: { user: config.user, pass: config.pass },
            });
        }
    } else {
        // Live SMTP
        transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.port === 465,
            auth: { user: config.user, pass: config.pass },
        });
    }

    const info = await transporter.sendMail({
      from: config.from || '"Baygunes System" <no-reply@baygunes.com>',
      to,
      subject: settings.is_demo ? `[DEMO] ${subject}` : subject,
      html
    });

    console.log(`📧 Email sent: ${info.messageId}`);
    if (settings.is_demo && nodemailer.getTestMessageUrl(info)) {
      console.log('🔗 Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    return true;

  } catch (error) {
    console.error('❌ Email Failed:', error);
    return false;
  }
};


// 2. Email Templates
export const WORKFLOW_EMAILS = {
  CREATED: (order) => ({
    subject: `Yeni Sipariş: ${order.client_name}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4f46e5;">Yeni Sipariş Alındı! 🎉</h2>
        <p><strong>Müşteri:</strong> ${order.client_name}</p>
        <p><strong>Lokasyon:</strong> ${order.pole_code}</p>
        <p><strong>Tarih:</strong> ${new Date(order.start_date).toLocaleDateString('tr-TR')} - ${new Date(order.end_date).toLocaleDateString('tr-TR')}</p>
        <hr/>
        <p><small>Bu mail otomatik gönderilmiştir.</small></p>
      </div>
    `
  }),
  STATUS_CHANGE: (order, oldStatus, newStatus) => {
    const statusMap = {
        'PENDING': 'Beklemede',
        'SCHEDULED': 'Planlandı',
        'PRINTING': 'Baskıda',
        'AWAITING_MOUNT': 'Montaj Bekliyor',
        'LIVE': 'Yayında',
        'EXPIRED': 'Süresi Doldu',
        'COMPLETED': 'Tamamlandı',
        'CANCELLED': 'İptal Edildi'
    };

    return {
        subject: `Sipariş Durumu: ${statusMap[newStatus] || newStatus}`,
        html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #059669;">Durum Güncellemesi 🚀</h2>
            <p><strong>${order.client_name}</strong> siparişi, <strong>${statusMap[oldStatus] || oldStatus}</strong> durumundan <strong>${statusMap[newStatus] || newStatus}</strong> durumuna geçti.</p>
            <br/>
            <a href="${process.env.FRONTEND_URL}/orders" style="display:inline-block; padding: 10px 20px; background: #059669; color: white; text-decoration: none; border-radius: 5px;">Panele Git</a>
        </div>
        `
    }
  }
};
