import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import path from 'path';
import { fileURLToPath } from 'url';

// Define dirname manually in ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { initScheduler } from './cron/scheduler.js';


const app = express();
const PORT = process.env.PORT || 3000;

const ensureRequiredEnv = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set in environment');
  }
};

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploads)
// Serve from backend/public/uploads available at http://localhost:3000/uploads
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api/', limiter);

// Routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import poleRoutes from './routes/pole.routes.js';
import orderRoutes from './routes/order.routes.js';

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'PBMS API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

// User routes
app.use('/api/users', userRoutes);

// Pole routes
app.use('/api/poles', poleRoutes);

// Order routes
app.use('/api/orders', orderRoutes);

// Account routes
import accountRoutes from './routes/account.routes.js';
app.use('/api/accounts', accountRoutes);

// Pricing routes
import pricingRoutes from './routes/pricing.routes.js';
app.use('/api/pricing', pricingRoutes);

// Transaction routes
import transactionRoutes from './routes/transaction.routes.js';
app.use('/api/transactions', transactionRoutes);

// Notification routes
import notificationRoutes from './routes/notification.routes.js';
app.use('/api/notifications', notificationRoutes);


// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

export const startServer = () => {
  ensureRequiredEnv();
  initScheduler();
  return app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 API health: http://localhost:${PORT}/api/health`);
  });
};

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isDirectRun) {
  startServer();
}

export default app;
