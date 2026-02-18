import { Client } from '@elastic/elasticsearch';

const rawIndexName = (process.env.ELASTICSEARCH_INDEX || 'baygunes').trim();
const INDEX_NAME = rawIndexName.toLowerCase().replace(/[^a-z0-9-_]+/g, '-');
const SERVICE_NAME = (process.env.SERVICE_NAME || 'baygunes-backend').trim();

const isElasticEnabled = () => Boolean((process.env.ELASTICSEARCH_URL || '').trim());

const buildClientOptions = () => {
  const node = (process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200').trim();
  const username = (process.env.ELASTICSEARCH_USERNAME || '').trim();
  const password = process.env.ELASTICSEARCH_PASSWORD || '';

  // Note: Coolify deployments often use self-signed certs or internal TLS.
  const options = {
    node,
    tls: {
      rejectUnauthorized: false,
    },
  };

  if (username) {
    options.auth = { username, password };
  }

  return options;
};

let esClient = null;

const getEsClient = () => {
  if (!isElasticEnabled()) return null;
  if (!esClient) {
    esClient = new Client(buildClientOptions());
  }
  return esClient;
};

const resolveExistsResult = (result) => {
  if (typeof result === 'boolean') return result;
  if (typeof result?.body === 'boolean') return result.body;
  if (typeof result?.statusCode === 'number') return result.statusCode === 200;
  return false;
};

// Initialize index with mappings
export const initElasticsearch = async () => {
  try {
    const client = getEsClient();
    if (!client) return;

    const indexExists = resolveExistsResult(
      await client.indices.exists({ index: INDEX_NAME })
    );
    
    if (!indexExists) {
      await client.indices.create({
        index: INDEX_NAME,
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
                code: { type: 'keyword' },
              },
            },
            metadata: { type: 'object' },
            ip: { type: 'ip' },
            userAgent: { type: 'text' },
            url: { type: 'text' },
            method: { type: 'keyword' },
            responseTime: { type: 'integer' },
            statusCode: { type: 'integer' },
          },
        },
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
        },
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
    const client = getEsClient();
    if (!client) {
      // When ES is not configured, fall back silently to console.
      console.log(`[${level}] ${message}`, metadata);
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: SERVICE_NAME,
      ...metadata
    };

    await client.index({
      index: INDEX_NAME,
      document: logEntry,
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
