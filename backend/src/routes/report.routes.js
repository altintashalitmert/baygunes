import express from 'express';
import { 
  generatePrinterReport, 
  generateFieldReport, 
  generateFinancialReport,
  exportReportToExcel,
  getReports
} from '../controllers/report.controller.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require Super Admin
router.use(authMiddleware, roleMiddleware(['SUPER_ADMIN']));

// POST /api/reports/printer
router.post('/printer', generatePrinterReport);

// POST /api/reports/field
router.post('/field', generateFieldReport);

// POST /api/reports/financial
router.post('/financial', generateFinancialReport);

// POST /api/reports/export/excel
router.post('/export/excel', exportReportToExcel);

// GET /api/reports
router.get('/', getReports);

export default router;
