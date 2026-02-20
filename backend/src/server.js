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
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

import { initScheduler } from './cron/scheduler.js';
import { errorLogger, initElasticsearch, logError, requestLogger } from './services/logging.service.js';
import { initNotificationQueueProcessor } from './services/notification.service.js';
import { ensureSchemaCompatibility } from './utils/schemaCompatibility.js';


const app = express();
const PORT = process.env.PORT || 3000;

const normalizeOrigin = (origin) => {
  try {
    const parsed = new URL(origin);
    return `${parsed.protocol}//${parsed.host}`.toLowerCase();
  } catch {
    return null;
  }
};

const expandOriginVariants = (origin) => {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return [];

  const parsed = new URL(normalized);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return [normalized];
  }

  // Support both http/https for the same host to avoid config drift.
  return [`http://${parsed.host}`.toLowerCase(), `https://${parsed.host}`.toLowerCase()];
};

const resolveCorsConfig = () => {
  const defaults = ['http://localhost:5173', 'https://localhost:5173'];
  const rawOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || defaults.join(',')).trim();

  const entries = rawOrigins
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (entries.includes('*')) {
    return { allowAll: true, origins: [] };
  }

  const origins = [...new Set(entries.flatMap(expandOriginVariants))];
  return {
    allowAll: false,
    origins: origins.length > 0 ? origins : defaults,
  };
};

const corsConfig = resolveCorsConfig();

if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

const ensureRequiredEnv = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set in environment');
  }
};

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsConfig.allowAll) {
      callback(null, true);
      return;
    }

    const normalized = normalizeOrigin(origin);
    callback(null, Boolean(normalized && corsConfig.origins.includes(normalized)));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const elasticEnabled = Boolean(process.env.ELASTICSEARCH_URL);
if (elasticEnabled) {
  initElasticsearch().catch((err) => {
    console.error('❌ Failed to initialize Elasticsearch:', err?.message || err);
  });
  app.use(requestLogger);
}

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

app.post('/api/log/error', (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

  if (!message) {
    return res.status(400).json({
      success: false,
      error: 'message is required',
    });
  }

  logError(message, {
    component: 'frontend-error-boundary',
    error: {
      message,
      stack: req.body?.stack,
    },
    metadata: {
      componentStack: req.body?.componentStack,
      frontendApp: req.body?.app,
      frontendTimestamp: req.body?.timestamp,
    },
    url: req.body?.url || req.get('referer'),
    userAgent: req.body?.userAgent || req.get('user-agent'),
    ip: req.ip,
  });

  return res.status(202).json({
    success: true,
    message: 'Error log accepted',
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

// Workflow routes
import workflowRoutes from './routes/workflow.routes.js';
app.use('/api/workflow', workflowRoutes);

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

// Report routes
import reportRoutes from './routes/report.routes.js';
app.use('/api/reports', reportRoutes);

if (elasticEnabled) {
  app.use(errorLogger);
}


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

export const startServer = async () => {
  ensureRequiredEnv();
  try {
    await ensureSchemaCompatibility();
  } catch (error) {
    console.error('⚠️ Schema compatibility check failed:', error?.message || error);
  }
  initScheduler();
  const redisConfigured = Boolean(process.env.REDIS_URL || process.env.REDIS_HOST);
  if (redisConfigured) {
    initNotificationQueueProcessor();
  }
  return app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 API health: http://localhost:${PORT}/api/health`);
    console.log(`🌐 CORS origins: ${corsConfig.allowAll ? '*' : corsConfig.origins.join(', ')}`);
  });
};

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isDirectRun) {
  startServer().catch((error) => {
    console.error('❌ Failed to start server:', error?.message || error);
    process.exit(1);
  });
}

export default app;
