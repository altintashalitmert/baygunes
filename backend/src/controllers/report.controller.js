import pool from '../utils/prisma.js';
import PDFDocument from 'pdfkit';
import { Parser } from 'json2csv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper: Get pricing config
const getPricingConfig = async (dbClient = pool) => {
  const result = await dbClient.query('SELECT * FROM pricing_config');
  const config = {};
  result.rows.forEach(row => {
    config[row.key] = parseFloat(row.value);
  });
  return config;
};

// Helper: Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2
  }).format(amount);
};

// Helper: Format date
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('tr-TR');
};

// GET /api/orders/:id/pdf - Generate Order PDF
export const generateOrderPdf = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Fetch Order Data with Relations
    const result = await pool.query(
      `SELECT o.*, 
        p.pole_code, p.city, p.district, p.neighborhood, p.street,
        a.company_name, a.contact_name as account_contact, a.email, a.phone, a.address, a.tax_no, a.tax_office,
        u.name as created_by_name
       FROM orders o
       LEFT JOIN poles p ON o.pole_id = p.id
       LEFT JOIN accounts a ON o.account_id = a.id
       LEFT JOIN users u ON o.created_by = u.id
       WHERE o.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const order = result.rows[0];

    // 2. Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=siparis_formu_${order.pole_code}_${order.id.split('-')[0]}.pdf`);

    // 3. Create PDF Document
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res); // Stream directly to response

    // --- Header ---
    doc.font('Helvetica-Bold').fontSize(20).text('BAYGUNES REKLAM', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('Direk ve Banner Reklam Sistemleri', { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, 80).lineTo(550, 80).strokeColor('#e2e8f0').stroke();

    // --- Title ---
    doc.moveDown(2);
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#1e293b').text('SİPARİŞ VE SÖZLEŞME FORMU', { align: 'center' });
    doc.moveDown();

    // --- Info Grid ---
    const startY = doc.y;
    
    // Left Column: Customer
    doc.fontSize(10).fillColor('#64748b').text('MÜŞTERİ BİLGİLERİ', 50, startY);
    doc.moveDown(0.5);
    doc.fillColor('#0f172a').font('Helvetica-Bold').text(order.company_name || order.account_contact || order.client_name);
    doc.font('Helvetica').text(order.address || 'Adres bilgisi yok');
    doc.text(`${order.phone || ''} - ${order.email || ''}`);
    if (order.tax_no) doc.text(`V.D: ${order.tax_office} - V.No: ${order.tax_no}`);

    // Right Column: Order Details
    doc.fontSize(10).fillColor('#64748b').text('SİPARİŞ DETAYLARI', 300, startY);
    doc.moveDown(0.5);
    doc.fillColor('#0f172a');
    doc.text(`Sipariş No: #${order.id.split('-')[0].toUpperCase()}`, 300);
    doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 300);
    doc.text(`Oluşturan: ${order.created_by_name}`, 300);

    doc.moveDown(3);

    // --- Pole Details Box ---
    const boxY = doc.y;
    doc.rect(50, boxY, 500, 80).fillAndStroke('#f8fafc', '#e2e8f0');
    
    doc.fillColor('#0f172a').text('KİRALANAN LOKASYON', 70, boxY + 20);
    doc.font('Helvetica-Bold').fontSize(14).text(`${order.pole_code} - ${order.district}`, 70, boxY + 40);
    doc.fontSize(10).font('Helvetica').text(`${order.neighborhood} Mh. ${order.street}`, 70, boxY + 60);

    // --- Dates & Status ---
    doc.text('KİRALAMA SÜRESİ', 350, boxY + 20);
    doc.font('Helvetica-Bold').text(`${new Date(order.start_date).toLocaleDateString()} - ${new Date(order.end_date).toLocaleDateString()}`, 350, boxY + 40);
    
    doc.moveDown(6);

    // --- Financial ---
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('TOPLAM TUTAR:', 350, doc.y);
    doc.fontSize(16).fillColor('#4338ca').text(`₺${Number(order.price).toLocaleString('tr-TR')}`, 450, doc.y - 15, { align: 'right' });

    doc.moveDown(4);

    // --- Signature Area ---
    doc.fontSize(10).fillColor('#000');
    doc.text('TESLİM EDEN (BAYGUNES)', 50, doc.y);
    doc.text('TESLİM ALAN (MÜŞTERİ)', 350, doc.y);
    
    doc.moveDown(4);
    doc.text('..........................................', 50);
    doc.text('..........................................', 350);

    // --- Footer ---
    doc.fontSize(8).fillColor('#94a3b8').text('Bu belge Baygunes PBMS sistemi tarafından otomatik oluşturulmuştur.', 50, 750, { align: 'center' });

    doc.end();

  } catch (error) {
    next(error);
  }
};

// POST /api/reports/printer - Generate printer report
export const generatePrinterReport = async (req, res, next) => {
  try {
    const { startDate, endDate, printerId } = req.body;
    const user = req.user;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'startDate and endDate are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Build query
    let query = `
      SELECT 
        o.*,
        p.pole_code,
        u.name as printer_name,
        u.email as printer_email
      FROM orders o
      JOIN poles p ON o.pole_id = p.id
      LEFT JOIN users u ON u.id = o.assigned_printer
      WHERE o.status IN ('COMPLETED', 'LIVE', 'EXPIRED')
      AND o.start_date >= $1
      AND o.end_date <= $2
    `;
    const params = [start, end];
    let paramCount = 3;

    if (printerId) {
      query += ` AND o.assigned_printer = $${paramCount++}`;
      params.push(printerId);
    }

    query += ` ORDER BY o.assigned_printer, o.start_date`;

    const ordersResult = await pool.query(query, params);
    const orders = ordersResult.rows;

    if (orders.length === 0) {
      return res.status(404).json({ success: false, error: 'No orders found for the given criteria' });
    }

    // Get pricing
    const pricing = await getPricingConfig();
    const printPricePerUnit = pricing.print_price || 500;
    const vatRate = (pricing.vat_rate || 20) / 100;

    // Group by printer
    const groupedByPrinter = orders.reduce((acc, order) => {
      const printerId = order.assigned_printer || 'unassigned';
      if (!acc[printerId]) {
        acc[printerId] = {
          printerId,
          printerName: order.printer_name || 'Unassigned',
          printerEmail: order.printer_email || '',
          orders: [],
          totalCount: 0,
          totalAmount: 0
        };
      }
      acc[printerId].orders.push(order);
      acc[printerId].totalCount++;
      acc[printerId].totalAmount += printPricePerUnit;
      return acc;
    }, {});

    // Generate PDF
    const doc = new PDFDocument();
    const filename = `printer-report-${Date.now()}.pdf`;
    const filepath = path.join(__dirname, '../../public/uploads/reports', filename);
    
    // Ensure directory exists
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
    
    doc.pipe(fs.createWriteStream(filepath));

    // Header
    doc.fontSize(20).text('Baskıcı Hak Ediş Raporu', 50, 50);
    doc.fontSize(12).text(`Dönem: ${formatDate(start)} - ${formatDate(end)}`, 50, 80);
    doc.text(`Rapor Tarihi: ${formatDate(new Date())}`, 50, 95);
    doc.moveDown(2);

    // Summary
    doc.fontSize(14).text('Özet', 50, doc.y);
    doc.fontSize(11);
    doc.text(`Toplam İş Adedi: ${orders.length}`, 50, doc.y + 10);
    doc.text(`Baskıcı Sayısı: ${Object.keys(groupedByPrinter).length}`, 50, doc.y + 5);
    doc.moveDown(2);

    // Details per printer
    Object.values(groupedByPrinter).forEach((printer) => {
      doc.fontSize(14).text(`Baskıcı: ${printer.printerName}`, 50, doc.y + 10);
      doc.fontSize(11);
      
      doc.text('İş Listesi:', 50, doc.y + 10);
      doc.moveDown(0.5);
      
      printer.orders.forEach((order, index) => {
        doc.text(`${index + 1}. ${order.client_name} - ${order.pole_code}`, 60, doc.y);
        doc.text(`   Tarih: ${formatDate(order.start_date)} - ${formatDate(order.end_date)}`, 60, doc.y + 5);
        doc.moveDown(0.3);
      });
      
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Toplam İş: ${printer.totalCount}`, 50, doc.y);
      doc.text(`Birim Fiyat: ${formatCurrency(printPricePerUnit)}`, 50, doc.y + 5);
      doc.text(`Toplam Tutar: ${formatCurrency(printer.totalAmount)}`, 50, doc.y + 5);
      doc.text(`KDV (%${(vatRate * 100).toFixed(0)}): ${formatCurrency(printer.totalAmount * vatRate)}`, 50, doc.y + 5);
      doc.fontSize(13).text(`GENEL TOPLAM: ${formatCurrency(printer.totalAmount * (1 + vatRate))}`, 50, doc.y + 10);
      
      doc.moveDown(2);
      
      // Add new page if needed
      if (doc.y > 700) {
        doc.addPage();
      }
    });

    doc.end();

    // Save report metadata to DB
    await pool.query(
      `INSERT INTO reports (type, title, file_url, file_type, start_date, end_date, generated_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      ['PRINTER', `Baskıcı Raporu - ${formatDate(start)} / ${formatDate(end)}`, `/uploads/reports/${filename}`, 'PDF', start, end, user.id]
    );

    res.json({
      success: true,
      data: {
        filename,
        downloadUrl: `/uploads/reports/${filename}`,
        totalOrders: orders.length,
        printers: Object.keys(groupedByPrinter).length
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/reports/field - Generate field team report
export const generateFieldReport = async (req, res, next) => {
  try {
    const { startDate, endDate, fieldId } = req.body;
    const user = req.user;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'startDate and endDate are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get completed orders with field team assignment
    let query = `
      SELECT 
        o.*,
        p.pole_code,
        u.name as field_name,
        u.email as field_email,
        (SELECT COUNT(*) FROM workflow_history 
         WHERE order_id = o.id AND new_status = 'LIVE') as mount_count,
        (SELECT COUNT(*) FROM workflow_history 
         WHERE order_id = o.id AND new_status = 'COMPLETED') as dismount_count
      FROM orders o
      JOIN poles p ON o.pole_id = p.id
      LEFT JOIN users u ON u.id = o.assigned_field
      WHERE o.status IN ('COMPLETED', 'LIVE')
      AND o.start_date >= $1
      AND o.end_date <= $2
    `;
    const params = [start, end];
    let paramCount = 3;

    if (fieldId) {
      query += ` AND o.assigned_field = $${paramCount++}`;
      params.push(fieldId);
    }

    query += ` ORDER BY o.assigned_field, o.start_date`;

    const ordersResult = await pool.query(query, params);
    const orders = ordersResult.rows;

    if (orders.length === 0) {
      return res.status(404).json({ success: false, error: 'No orders found for the given criteria' });
    }

    // Get pricing
    const pricing = await getPricingConfig();
    const mountPrice = pricing.mount_price || 200;
    const dismountPrice = pricing.dismount_price || 150;
    const vatRate = (pricing.vat_rate || 20) / 100;

    // Group by field team
    const groupedByField = orders.reduce((acc, order) => {
      const fieldId = order.assigned_field || 'unassigned';
      if (!acc[fieldId]) {
        acc[fieldId] = {
          fieldId,
          fieldName: order.field_name || 'Unassigned',
          fieldEmail: order.field_email || '',
          orders: [],
          mountCount: 0,
          dismountCount: 0,
          totalAmount: 0
        };
      }
      acc[fieldId].orders.push(order);
      acc[fieldId].mountCount += order.mount_count || 1;
      acc[fieldId].dismountCount += order.dismount_count || (order.status === 'COMPLETED' ? 1 : 0);
      acc[fieldId].totalAmount += (mountPrice + (order.status === 'COMPLETED' ? dismountPrice : 0));
      return acc;
    }, {});

    // Generate PDF
    const doc = new PDFDocument();
    const filename = `field-report-${Date.now()}.pdf`;
    const filepath = path.join(__dirname, '../../public/uploads/reports', filename);
    
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
    
    doc.pipe(fs.createWriteStream(filepath));

    // Header
    doc.fontSize(20).text('Saha Ekibi Hak Ediş Raporu', 50, 50);
    doc.fontSize(12).text(`Dönem: ${formatDate(start)} - ${formatDate(end)}`, 50, 80);
    doc.text(`Rapor Tarihi: ${formatDate(new Date())}`, 50, 95);
    doc.moveDown(2);

    // Summary
    doc.fontSize(14).text('Özet', 50, doc.y);
    doc.fontSize(11);
    doc.text(`Toplam İş: ${orders.length}`, 50, doc.y + 10);
    doc.text(`Saha Ekibi Sayısı: ${Object.keys(groupedByField).length}`, 50, doc.y + 5);
    doc.moveDown(2);

    // Details per field team
    Object.values(groupedByField).forEach((field) => {
      doc.fontSize(14).text(`Ekip: ${field.fieldName}`, 50, doc.y + 10);
      doc.fontSize(11);
      
      doc.text(`Montaj Sayısı: ${field.mountCount}`, 50, doc.y + 10);
      doc.text(`Söküm Sayısı: ${field.dismountCount}`, 50, doc.y + 5);
      doc.moveDown(0.5);
      
      doc.text('İş Listesi:', 50, doc.y + 5);
      doc.moveDown(0.5);
      
      field.orders.slice(0, 10).forEach((order, index) => {
        doc.text(`${index + 1}. ${order.client_name} - ${order.pole_code}`, 60, doc.y);
        doc.text(`   Montaj: ${formatDate(order.start_date)}`, 60, doc.y + 5);
        if (order.status === 'COMPLETED') {
          doc.text(`   Söküm: ${formatDate(order.end_date)}`, 60, doc.y + 5);
        }
        doc.moveDown(0.3);
      });
      
      if (field.orders.length > 10) {
        doc.text(`   ... ve ${field.orders.length - 10} iş daha`, 60, doc.y);
        doc.moveDown(0.5);
      }
      
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Montaj Ücreti: ${formatCurrency(mountPrice)} x ${field.mountCount}`, 50, doc.y);
      doc.text(`Söküm Ücreti: ${formatCurrency(dismountPrice)} x ${field.dismountCount}`, 50, doc.y + 5);
      doc.text(`Toplam Tutar: ${formatCurrency(field.totalAmount)}`, 50, doc.y + 5);
      doc.text(`KDV (%${(vatRate * 100).toFixed(0)}): ${formatCurrency(field.totalAmount * vatRate)}`, 50, doc.y + 5);
      doc.fontSize(13).text(`GENEL TOPLAM: ${formatCurrency(field.totalAmount * (1 + vatRate))}`, 50, doc.y + 10);
      
      doc.moveDown(2);
      
      if (doc.y > 700) {
        doc.addPage();
      }
    });

    doc.end();

    // Save report metadata
    await pool.query(
      `INSERT INTO reports (type, title, file_url, file_type, start_date, end_date, generated_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      ['FIELD', `Saha Ekibi Raporu - ${formatDate(start)} / ${formatDate(end)}`, `/uploads/reports/${filename}`, 'PDF', start, end, user.id]
    );

    res.json({
      success: true,
      data: {
        filename,
        downloadUrl: `/uploads/reports/${filename}`,
        totalOrders: orders.length,
        fieldTeams: Object.keys(groupedByField).length
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/reports/financial - Generate financial summary report
export const generateFinancialReport = async (req, res, next) => {
  try {
    const { startDate, endDate, period } = req.body;
    const user = req.user;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'startDate and endDate are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get all orders in period
    const ordersResult = await pool.query(
      `SELECT 
        o.*,
        p.pole_code,
        p.status as pole_status
      FROM orders o
      JOIN poles p ON o.pole_id = p.id
      WHERE o.created_at >= $1
      AND o.created_at <= $2
      ORDER BY o.created_at`,
      [start, end]
    );

    const orders = ordersResult.rows;

    // Get pricing
    const pricing = await getPricingConfig();
    const printPrice = pricing.print_price || 500;
    const mountPrice = pricing.mount_price || 200;
    const dismountPrice = pricing.dismount_price || 150;
    const vatRate = (pricing.vat_rate || 20) / 100;

    // Calculate statistics
    const stats = {
      totalOrders: orders.length,
      pending: orders.filter(o => o.status === 'PENDING').length,
      printing: orders.filter(o => o.status === 'PRINTING').length,
      awaitingMount: orders.filter(o => o.status === 'AWAITING_MOUNT').length,
      live: orders.filter(o => o.status === 'LIVE').length,
      expired: orders.filter(o => o.status === 'EXPIRED').length,
      completed: orders.filter(o => o.status === 'COMPLETED').length,
      cancelled: orders.filter(o => o.status === 'CANCELLED').length,
      totalRevenue: orders.reduce((sum, o) => sum + (parseFloat(o.price) || 0), 0),
      totalPrintCost: orders.filter(o => ['COMPLETED', 'LIVE', 'EXPIRED'].includes(o.status)).length * printPrice,
      totalMountCost: orders.filter(o => ['COMPLETED', 'LIVE', 'EXPIRED'].includes(o.status)).length * mountPrice,
      totalDismountCost: orders.filter(o => o.status === 'COMPLETED').length * dismountPrice,
    };

    stats.totalExpense = stats.totalPrintCost + stats.totalMountCost + stats.totalDismountCost;
    stats.netProfit = stats.totalRevenue - stats.totalExpense;
    stats.vatAmount = stats.netProfit * vatRate;

    // Get total pole count for occupancy rate
    const polesResult = await pool.query(`SELECT COUNT(*) as total FROM poles WHERE deleted_at IS NULL`);
    const totalPoles = parseInt(polesResult.rows[0].total);
    const occupiedPoles = orders.filter(o => ['LIVE', 'EXPIRED'].includes(o.status)).length;
    stats.occupancyRate = totalPoles > 0 ? ((occupiedPoles / totalPoles) * 100).toFixed(1) : 0;

    // Generate PDF
    const doc = new PDFDocument();
    const filename = `financial-report-${Date.now()}.pdf`;
    const filepath = path.join(__dirname, '../../public/uploads/reports', filename);
    
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
    
    doc.pipe(fs.createWriteStream(filepath));

    // Header
    doc.fontSize(20).text('Finansal Özet Raporu', 50, 50);
    doc.fontSize(12).text(`Dönem: ${formatDate(start)} - ${formatDate(end)}`, 50, 80);
    doc.text(`Rapor Tarihi: ${formatDate(new Date())}`, 50, 95);
    doc.moveDown(2);

    // Statistics
    doc.fontSize(16).text('Sipariş İstatistikleri', 50, doc.y);
    doc.fontSize(11);
    doc.text(`Toplam Sipariş: ${stats.totalOrders}`, 50, doc.y + 15);
    doc.text(`Beklemede: ${stats.pending}`, 50, doc.y + 5);
    doc.text(`Baskıda: ${stats.printing}`, 50, doc.y + 5);
    doc.text(`Montaj Bekliyor: ${stats.awaitingMount}`, 50, doc.y + 5);
    doc.text(`Yayında: ${stats.live}`, 50, doc.y + 5);
    doc.text(`Süresi Doldu: ${stats.expired}`, 50, doc.y + 5);
    doc.text(`Tamamlandı: ${stats.completed}`, 50, doc.y + 5);
    doc.text(`İptal Edildi: ${stats.cancelled}`, 50, doc.y + 5);
    doc.moveDown(2);

    // Financial Summary
    doc.fontSize(16).text('Finansal Özet', 50, doc.y);
    doc.fontSize(11);
    doc.text(`Toplam Gelir: ${formatCurrency(stats.totalRevenue)}`, 50, doc.y + 15);
    doc.moveDown(0.5);
    
    doc.text('Giderler:', 50, doc.y);
    doc.text(`  Baskı Maliyeti: ${formatCurrency(stats.totalPrintCost)}`, 50, doc.y + 5);
    doc.text(`  Montaj Maliyeti: ${formatCurrency(stats.totalMountCost)}`, 50, doc.y + 5);
    doc.text(`  Söküm Maliyeti: ${formatCurrency(stats.totalDismountCost)}`, 50, doc.y + 5);
    doc.text(`  Toplam Gider: ${formatCurrency(stats.totalExpense)}`, 50, doc.y + 5);
    doc.moveDown(0.5);
    
    doc.fontSize(13).text(`NET KAR: ${formatCurrency(stats.netProfit)}`, 50, doc.y + 10);
    doc.fontSize(11).text(`KDV (%${(vatRate * 100).toFixed(0)}): ${formatCurrency(stats.vatAmount)}`, 50, doc.y + 5);
    doc.fontSize(14).text(`TOPLAM KAZANÇ: ${formatCurrency(stats.netProfit - stats.vatAmount)}`, 50, doc.y + 10);
    doc.moveDown(2);

    // Occupancy Rate
    doc.fontSize(16).text('Doluluk Oranı', 50, doc.y);
    doc.fontSize(11);
    doc.text(`Toplam Direk: ${totalPoles}`, 50, doc.y + 15);
    doc.text(`Dolu Direk: ${occupiedPoles}`, 50, doc.y + 5);
    doc.fontSize(14).text(`Doluluk Oranı: %${stats.occupancyRate}`, 50, doc.y + 10);

    doc.end();

    // Save report metadata
    await pool.query(
      `INSERT INTO reports (type, title, file_url, file_type, start_date, end_date, generated_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      ['FINANCIAL', `Finansal Rapor - ${formatDate(start)} / ${formatDate(end)}`, `/uploads/reports/${filename}`, 'PDF', start, end, user.id]
    );

    res.json({
      success: true,
      data: {
        filename,
        downloadUrl: `/uploads/reports/${filename}`,
        stats
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/reports/export/excel - Export reports to Excel/CSV
export const exportReportToExcel = async (req, res, next) => {
  try {
    const { type, startDate, endDate } = req.body;

    if (!type || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'type, startDate and endDate are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    let data = [];
    let fields = [];
    let filename = '';

    if (type === 'ORDERS') {
      const result = await pool.query(
        `SELECT 
          o.id,
          o.client_name,
          o.client_contact,
          p.pole_code,
          o.start_date,
          o.end_date,
          o.status,
          o.price,
          u1.name as printer_name,
          u2.name as field_name,
          o.created_at
        FROM orders o
        JOIN poles p ON o.pole_id = p.id
        LEFT JOIN users u1 ON u1.id = o.assigned_printer
        LEFT JOIN users u2 ON u2.id = o.assigned_field
        WHERE o.created_at >= $1 AND o.created_at <= $2
        ORDER BY o.created_at DESC`,
        [start, end]
      );
      
      data = result.rows.map(row => ({
        'Sipariş ID': row.id,
        'Müşteri': row.client_name,
        'İletişim': row.client_contact,
        'Direk Kodu': row.pole_code,
        'Başlangıç': formatDate(row.start_date),
        'Bitiş': formatDate(row.end_date),
        'Durum': row.status,
        'Fiyat': row.price,
        'Baskıcı': row.printer_name || '',
        'Saha Ekibi': row.field_name || '',
        'Oluşturulma': formatDate(row.created_at)
      }));
      
      fields = Object.keys(data[0] || {});
      filename = `orders-export-${Date.now()}.csv`;
    } else if (type === 'POLES') {
      const result = await pool.query(
        `SELECT 
          p.pole_code,
          p.city,
          p.district,
          p.neighborhood,
          p.street,
          p.status,
          p.created_at,
          COUNT(o.id) as order_count
        FROM poles p
        LEFT JOIN orders o ON o.pole_id = p.id AND o.status NOT IN ('CANCELLED')
        WHERE p.deleted_at IS NULL
        GROUP BY p.id
        ORDER BY p.pole_code`
      );
      
      data = result.rows.map(row => ({
        'Direk Kodu': row.pole_code,
        'Şehir': row.city,
        'İlçe': row.district,
        'Mahalle': row.neighborhood,
        'Cadde': row.street,
        'Durum': row.status,
        'Sipariş Sayısı': row.order_count,
        'Oluşturulma': formatDate(row.created_at)
      }));
      
      fields = Object.keys(data[0] || {});
      filename = `poles-export-${Date.now()}.csv`;
    }

    if (data.length === 0) {
      return res.status(404).json({ success: false, error: 'No data found for export' });
    }

    // Generate CSV
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(data);

    // Save to file
    const filepath = path.join(__dirname, '../../public/uploads/reports', filename);
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
    fs.writeFileSync(filepath, csv);

    res.json({
      success: true,
      data: {
        filename,
        downloadUrl: `/uploads/reports/${filename}`,
        recordCount: data.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/reports - List generated reports
export const getReports = async (req, res, next) => {
  try {
    const { type } = req.query;
    
    let query = `SELECT * FROM reports WHERE 1=1`;
    const params = [];
    
    if (type) {
      query += ` AND type = $1`;
      params.push(type);
    }
    
    query += ` ORDER BY created_at DESC`;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: { reports: result.rows }
    });
  } catch (error) {
    next(error);
  }
};
