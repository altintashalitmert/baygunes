import { Client } from '@elastic/elasticsearch';

// Elasticsearch client configuration
const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200',
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME || '',
    password: process.env.ELASTICSEARCH_PASSWORD || ''
  },
  tls: {
    rejectUnauthorized: false
  }
});

const INDEX_NAME = 'baygunes-logs';

// Initialize index with mappings
export const initElasticsearch = async () => {
  try {
    const indexExists = await esClient.indices.exists({ index: INDEX_NAME });
    
    if (!indexExists) {
      await esClient.indices.create({
        index: INDEX_NAME,
        body: {
          mappings: {
            properties: {
              timestamp: { type: 'date' },
              level: { type: 'keyword' },
              message: { type: 'text' },
              service: { type: 'keyword' },
              component: { type: 'keyword' },
              userId: { type: 'keyword' },
              orderId: { type: 'keyword' },
              poleId: { type: 'keyword' },
              error: {
                properties: {
                  message: { type: 'text' },
                  stack: { type: 'text' },
                  code: { type: 'keyword' }
                }
              },
              metadata: { type: 'object' },
              ip: { type: 'ip' },
              userAgent: { type: 'text' },
              url: { type: 'text' },
              method: { type: 'keyword' },
              responseTime: { type: 'integer' },
              statusCode: { type: 'integer' }
            }
          },
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0
          }
        }
      });
      console.log('✅ Elasticsearch index created:', INDEX_NAME);
    }
  } catch (error) {
    console.error('❌ Failed to initialize Elasticsearch:', error.message);
  }
};

// Log function
export const logToElasticsearch = async (level, message, metadata = {}) => {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: 'baygunes-backend',
      ...metadata
    };

    await esClient.index({
      index: INDEX_NAME,
      body: logEntry
    });
  } catch (error) {
    console.error('❌ Failed to log to Elasticsearch:', error.message);
    // Fallback to console
    console.log(`[${level}] ${message}`, metadata);
  }
};

// Convenience methods
export const logError = (message, metadata = {}) => 
  logToElasticsearch('error', message, metadata);

export const logInfo = (message, metadata = {}) => 
  logToElasticsearch('info', message, metadata);

export const logWarning = (message, metadata = {}) => 
  logToElasticsearch('warning', message, metadata);

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warning' : 'info';
    
    logToElasticsearch(level, `${req.method} ${req.path}`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id
    });
  });
  
  next();
};

// Error logging middleware
export const errorLogger = (err, req, res, next) => {
  logError(err.message, {
    component: 'error-handler',
    error: {
      message: err.message,
      stack: err.stack,
      code: err.code
    },
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
    ip: req.ip
  });
  
  next(err);
};

export default {
  initElasticsearch,
  logToElasticsearch,
  logError,
  logInfo,
  logWarning,
  requestLogger,
  errorLogger
};
