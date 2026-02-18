// Email Templates for Baygunes PBMS Notifications

export const emailTemplates = {
  // 1. New Order Created
  newOrder: (order, pole, creator) => ({
    subject: `Yeni Sipariş Alındı - ${order.client_name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #4f46e5; padding: 20px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0;">Baygunes PBMS</h2>
          <p style="color: #e0e7ff; margin: 5px 0 0 0;">Yeni Sipariş Bildirimi</p>
        </div>
        
        <div style="padding: 30px;">
          <h3 style="color: #1f2937; margin-bottom: 20px;">Yeni Sipariş Alındı!</h3>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h4 style="color: #374151; margin: 0 0 15px 0;">Sipariş Detayları</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; width: 40%;">Müşteri:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${order.client_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Direk:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${pole.pole_code}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Konum:</td>
                <td style="padding: 8px 0; color: #1f2937;">${pole.district}, ${pole.neighborhood || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Tarih Aralığı:</td>
                <td style="padding: 8px 0; color: #1f2937;">${new Date(order.start_date).toLocaleDateString('tr-TR')} - ${new Date(order.end_date).toLocaleDateString('tr-TR')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Tutar:</td>
                <td style="padding: 8px 0; color: #059669; font-weight: 600; font-size: 18px;">₺${order.price}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Oluşturan:</td>
                <td style="padding: 8px 0; color: #1f2937;">${creator}</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/orders/${order.id}" 
               style="background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Siparişi Görüntüle
            </a>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <p style="color: #6b7280; font-size: 12px; text-align: center;">
              Bu email Baygunes PBMS sistemi tarafından otomatik gönderilmiştir.<br>
              © ${new Date().getFullYear()} Baygunes Reklam Sistemleri
            </p>
          </div>
        </div>
      </div>
    `
  }),

  // 2. Printer Assignment
  printerAssigned: (order, pole, printer, assignedBy) => ({
    subject: `Yeni Baskı İşi Atandı - ${order.client_name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #059669; padding: 20px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0;">Baygunes PBMS</h2>
          <p style="color: #d1fae5; margin: 5px 0 0 0;">Baskı İşi Ataması</p>
        </div>
        
        <div style="padding: 30px;">
          <h3 style="color: #1f2937; margin-bottom: 20px;">Merhaba ${printer.name},</h3>
          <p style="color: #4b5563; margin-bottom: 20px;">Size yeni bir baskı işi atandı. Lütfen detayları kontrol ediniz.</p>
          
          <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #059669;">
            <h4 style="color: #065f46; margin: 0 0 15px 0;">İş Detayları</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; width: 40%;">Müşteri:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${order.client_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Direk Kodu:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${pole.pole_code}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Konum:</td>
                <td style="padding: 8px 0; color: #1f2937;">${pole.district}, ${pole.neighborhood || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Son Teslim:</td>
                <td style="padding: 8px 0; color: #dc2626; font-weight: 600;">${new Date(order.start_date).toLocaleDateString('tr-TR')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Atayan:</td>
                <td style="padding: 8px 0; color: #1f2937;">${assignedBy}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>Not:</strong> Baskı tamamlandığında lütfen sisteme giriş yaparak durumu güncelleyin ve saha ekibi ataması yapın.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/print-tasks" 
               style="background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Görevlerime Git
            </a>
          </div>
        </div>
      </div>
    `
  }),

  // 3. Field Team Assignment
  fieldAssigned: (order, pole, fieldUser, assignedBy, isMount = true) => ({
    subject: `${isMount ? 'Montaj' : 'Söküm'} Görevi Atandı - ${order.client_name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #d97706; padding: 20px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0;">Baygunes PBMS</h2>
          <p style="color: #fef3c7; margin: 5px 0 0 0;">Saha Ekibi Görevi</p>
        </div>
        
        <div style="padding: 30px;">
          <h3 style="color: #1f2937; margin-bottom: 20px;">Merhaba ${fieldUser.name},</h3>
          <p style="color: #4b5563; margin-bottom: 20px;">Size yeni bir ${isMount ? 'montaj' : 'söküm'} görevi atandı.</p>
          
          <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #d97706;">
            <h4 style="color: #92400e; margin: 0 0 15px 0;">Görev Detayları</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; width: 40%;">Müşteri:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${order.client_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Direk Kodu:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${pole.pole_code}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">İl/İlçe:</td>
                <td style="padding: 8px 0; color: #1f2937;">${pole.city || 'N/A'} / ${pole.district}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Mahalle:</td>
                <td style="padding: 8px 0; color: #1f2937;">${pole.neighborhood || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Cadde:</td>
                <td style="padding: 8px 0; color: #1f2937;">${pole.street || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">İşlem Tarihi:</td>
                <td style="padding: 8px 0; color: #dc2626; font-weight: 600;">${new Date(isMount ? order.start_date : order.end_date).toLocaleDateString('tr-TR')}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #dbeafe; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <p style="color: #1e40af; margin: 0 0 10px 0; font-weight: 600;">Konum Bilgisi:</p>
            <p style="color: #1e40af; margin: 0; font-size: 14px;">
              Enlem: ${pole.latitude}<br>
              Boylam: ${pole.longitude}
            </p>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${pole.latitude},${pole.longitude}" 
               style="display: inline-block; margin-top: 10px; background: #2563eb; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-size: 14px;">
              Yol Tarifi Al
            </a>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>Önemli:</strong> İşlem tamamlandığında lütfen fotoğraf çekip sisteme yükleyin. Fotoğraf olmadan işlem tamamlanamaz.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/field-tasks" 
               style="background: #d97706; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Görevlerime Git
            </a>
          </div>
        </div>
      </div>
    `
  }),

  // 4. Status Change
  statusChanged: (order, pole, oldStatus, newStatus, changedBy) => {
    const statusLabels = {
      'PENDING': 'Beklemede',
      'SCHEDULED': 'Planlandı',
      'PRINTING': 'Baskıda',
      'AWAITING_MOUNT': 'Montaj Bekliyor',
      'LIVE': 'Yayında',
      'EXPIRED': 'Süresi Doldu',
      'COMPLETED': 'Tamamlandı',
      'CANCELLED': 'İptal Edildi'
    };

    const getStatusColor = (status) => {
      const colors = {
        'PENDING': '#d97706',
        'SCHEDULED': '#6b7280',
        'PRINTING': '#3b82f6',
        'AWAITING_MOUNT': '#8b5cf6',
        'LIVE': '#059669',
        'EXPIRED': '#dc2626',
        'COMPLETED': '#059669',
        'CANCELLED': '#dc2626'
      };
      return colors[status] || '#6b7280';
    };

    return {
      subject: `Sipariş Durumu Güncellendi - ${order.client_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: #4f46e5; padding: 20px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0;">Baygunes PBMS</h2>
            <p style="color: #e0e7ff; margin: 5px 0 0 0;">Durum Güncellemesi</p>
          </div>
          
          <div style="padding: 30px;">
            <h3 style="color: #1f2937; margin-bottom: 20px;">Sipariş Durumu Değişti</h3>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h4 style="color: #374151; margin: 0 0 15px 0;">Değişiklik Bilgisi</h4>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; width: 40%;">Müşteri:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${order.client_name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Direk:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${pole.pole_code}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Eski Durum:</td>
                  <td style="padding: 8px 0;">
                    <span style="background: ${getStatusColor(oldStatus)}20; color: ${getStatusColor(oldStatus)}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                      ${statusLabels[oldStatus]}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Yeni Durum:</td>
                  <td style="padding: 8px 0;">
                    <span style="background: ${getStatusColor(newStatus)}20; color: ${getStatusColor(newStatus)}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                      ${statusLabels[newStatus]}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Güncelleyen:</td>
                  <td style="padding: 8px 0; color: #1f2937;">${changedBy}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Tarih:</td>
                  <td style="padding: 8px 0; color: #1f2937;">${new Date().toLocaleString('tr-TR')}</td>
                </tr>
              </table>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/orders/${order.id}" 
                 style="background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                Siparişi Görüntüle
              </a>
            </div>
          </div>
        </div>
      `
    };
  },

  // 5. Daily Summary (for Admins)
  dailySummary: (stats, date) => ({
    subject: `Günlük Özet Rapor - ${new Date(date).toLocaleDateString('tr-TR')}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #1f2937; padding: 20px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0;">Baygunes PBMS</h2>
          <p style="color: #9ca3af; margin: 5px 0 0 0;">Günlük Özet Raporu</p>
        </div>
        
        <div style="padding: 30px;">
          <h3 style="color: #1f2937; margin-bottom: 20px;">${new Date(date).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; text-align: center;">
              <p style="color: #059669; font-size: 32px; font-weight: bold; margin: 0;">${stats.newOrders || 0}</p>
              <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">Yeni Sipariş</p>
            </div>
            <div style="background: #dbeafe; padding: 20px; border-radius: 8px; text-align: center;">
              <p style="color: #2563eb; font-size: 32px; font-weight: bold; margin: 0;">${stats.completed || 0}</p>
              <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">Tamamlanan</p>
            </div>
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; text-align: center;">
              <p style="color: #d97706; font-size: 32px; font-weight: bold; margin: 0;">${stats.pendingAssignments || 0}</p>
              <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">Bekleyen Atama</p>
            </div>
            <div style="background: #f3e8ff; padding: 20px; border-radius: 8px; text-align: center;">
              <p style="color: #9333ea; font-size: 32px; font-weight: bold; margin: 0;">₺${stats.totalRevenue || 0}</p>
              <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">Toplam Gelir</p>
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/dashboard" 
               style="background: #1f2937; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Dashboard'a Git
            </a>
          </div>
        </div>
      </div>
    `
  })
};

export default emailTemplates;
