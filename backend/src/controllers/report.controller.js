
import pool from '../utils/prisma.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

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
