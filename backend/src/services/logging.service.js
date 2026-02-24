import { Client } from '@elastic/elasticsearch';
import { isIP } from 'node:net';

const DEFAULT_INDEX = 'baygunes';
const DEFAULT_SERVICE = 'baygunes-backend';

const ELASTICSEARCH_URL = (process.env.ELASTICSEARCH_URL || '').trim();
const ELASTICSEARCH_USERNAME = (process.env.ELASTICSEARCH_USERNAME || '').trim();
const ELASTICSEARCH_PASSWORD = process.env.ELASTICSEARCH_PASSWORD || '';

const rawIndexName = (process.env.ELASTICSEARCH_INDEX || DEFAULT_INDEX).trim();
const INDEX_NAME = rawIndexName.toLowerCase().replace(/[^a-z0-9-_]+/g, '-') || DEFAULT_INDEX;
const SERVICE_NAME = (process.env.SERVICE_NAME || DEFAULT_SERVICE).trim();

const loggingEnabledFlag = (process.env.ELASTICSEARCH_LOGGING_ENABLED || 'true').trim().toLowerCase();
const LOGGING_ENABLED =
  Boolean(ELASTICSEARCH_URL) && !['0', 'false', 'off', 'no'].includes(loggingEnabledFlag);

const parsePositiveInt = (rawValue, fallback) => {
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const MAX_QUEUE_SIZE = parsePositiveInt(process.env.ELASTICSEARCH_LOG_QUEUE_SIZE, 1000);
const BULK_BATCH_SIZE = parsePositiveInt(process.env.ELASTICSEARCH_LOG_BATCH_SIZE, 100);
const BULK_FLUSH_INTERVAL_MS = parsePositiveInt(process.env.ELASTICSEARCH_LOG_FLUSH_MS, 1000);

let esClient = null;
let indexInitialized = false;
let flushTimer = null;
let isFlushing = false;
let droppedLogCount = 0;
const logQueue = [];

const elasticErrorReason = (error) =>
  error?.meta?.body?.error?.reason ||
  error?.meta?.body?.error?.type ||
  error?.message ||
  JSON.stringify(error);

const resolveExistsResult = (result) => {
  if (typeof result === 'boolean') return result;
  if (typeof result?.body === 'boolean') return result.body;
  if (typeof result?.statusCode === 'number') return result.statusCode === 200;
  return false;
};

const normalizeIp = (ipValue) => {
  const raw = String(ipValue || '').trim();
  if (!raw) return undefined;

  const firstToken = raw.split(',')[0].trim();
  const cleaned = firstToken.startsWith('::ffff:') ? firstToken.slice(7) : firstToken;
  return isIP(cleaned) ? cleaned : undefined;
};

const buildClientOptions = () => {
  const options = { node: ELASTICSEARCH_URL };

  if (ELASTICSEARCH_URL.startsWith('https://')) {
    options.tls = { rejectUnauthorized: false };
  }

  if (ELASTICSEARCH_USERNAME) {
    options.auth = {
      username: ELASTICSEARCH_USERNAME,
      password: ELASTICSEARCH_PASSWORD,
    };
  }

  return options;
};

const getEsClient = () => {
  if (!LOGGING_ENABLED) return null;
  if (!esClient) {
    esClient = new Client(buildClientOptions());
  }
  return esClient;
};

const ensureFlushLoop = () => {
  if (!LOGGING_ENABLED || flushTimer) return;
  flushTimer = setInterval(() => {
    flushQueue().catch((error) => {
      console.error('❌ Elasticsearch periodic flush failed:', elasticErrorReason(error));
    });
  }, BULK_FLUSH_INTERVAL_MS);

  if (typeof flushTimer.unref === 'function') {
    flushTimer.unref();
  }
};

const createIndexIfMissing = async (client) => {
  const exists = resolveExistsResult(await client.indices.exists({ index: INDEX_NAME }));
  if (exists) return;

  await client.indices.create({
    index: INDEX_NAME,
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
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
};

const enqueueLog = (document) => {
  if (!LOGGING_ENABLED) {
    if (document.level === 'error') {
      console.error(`[${document.level}] ${document.message}`, document);
    }
    return;
  }

  if (logQueue.length >= MAX_QUEUE_SIZE) {
    logQueue.shift();
    droppedLogCount += 1;
  }

  logQueue.push(document);
  ensureFlushLoop();

  if (logQueue.length >= BULK_BATCH_SIZE) {
    flushQueue().catch((error) => {
      console.error('❌ Elasticsearch immediate flush failed:', elasticErrorReason(error));
    });
  }
};

export const initElasticsearch = async () => {
  if (!LOGGING_ENABLED) return;

  try {
    const client = getEsClient();
    if (!client) return;

    await client.ping();
    await createIndexIfMissing(client);
    indexInitialized = true;
    ensureFlushLoop();
  } catch (error) {
    indexInitialized = false;
    console.error('❌ Failed to initialize Elasticsearch:', elasticErrorReason(error));
  }
};

export const flushQueue = async ({ force = false } = {}) => {
  if (!LOGGING_ENABLED) return;
  if (isFlushing) return;
  if (logQueue.length === 0) return;

  const client = getEsClient();
  if (!client) return;

  isFlushing = true;
  try {
    if (!indexInitialized) {
      await initElasticsearch();
      if (!indexInitialized) {
        droppedLogCount += logQueue.length;
        logQueue.length = 0;
        return;
      }
    }

    do {
      const batch = logQueue.splice(0, BULK_BATCH_SIZE);
      if (batch.length === 0) break;

      const operations = [];
      for (const entry of batch) {
        operations.push({ index: { _index: INDEX_NAME } }, entry);
      }

      const response = await client.bulk({
        operations,
        refresh: false,
      });

      if (response?.errors) {
        const failedCount =
          response.items?.filter((item) => Boolean(item?.index?.error)).length || 0;
        if (failedCount > 0) {
          droppedLogCount += failedCount;
          console.error(`⚠️ Elasticsearch bulk write had ${failedCount} failed item(s).`);
        }
      }
    } while (force && logQueue.length > 0);
  } catch (error) {
    console.error('❌ Failed to flush logs to Elasticsearch:', elasticErrorReason(error));
  } finally {
    isFlushing = false;
  }
};

export const getElasticsearchStatus = async () => {
  if (!LOGGING_ENABLED) {
    return {
      enabled: false,
      connected: false,
      index: INDEX_NAME,
      queueDepth: 0,
      dropped: droppedLogCount,
    };
  }

  try {
    const client = getEsClient();
    await client.ping();
    const indexExists = resolveExistsResult(await client.indices.exists({ index: INDEX_NAME }));

    return {
      enabled: true,
      connected: true,
      index: INDEX_NAME,
      indexExists,
      queueDepth: logQueue.length,
      dropped: droppedLogCount,
      batchSize: BULK_BATCH_SIZE,
      flushIntervalMs: BULK_FLUSH_INTERVAL_MS,
    };
  } catch (error) {
    return {
      enabled: true,
      connected: false,
      index: INDEX_NAME,
      queueDepth: logQueue.length,
      dropped: droppedLogCount,
      error: elasticErrorReason(error),
    };
  }
};

export const logToElasticsearch = async (level, message, metadata = {}) => {
  try {
    const timestamp = new Date().toISOString();
    const normalizedMetadata = { ...metadata };
    if ('ip' in normalizedMetadata) {
      normalizedMetadata.ip = normalizeIp(normalizedMetadata.ip);
      if (!normalizedMetadata.ip) delete normalizedMetadata.ip;
    }

    const logEntry = {
      '@timestamp': timestamp,
      timestamp,
      level,
      message,
      service: SERVICE_NAME,
      ...normalizedMetadata,
    };

    enqueueLog(logEntry);
  } catch (error) {
    console.error('❌ Failed to enqueue Elasticsearch log:', elasticErrorReason(error));
  }
};

export const logError = (message, metadata = {}) => logToElasticsearch('error', message, metadata);
export const logInfo = (message, metadata = {}) => logToElasticsearch('info', message, metadata);
export const logWarning = (message, metadata = {}) =>
  logToElasticsearch('warning', message, metadata);

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
      userId: req.user?.id,
      metadata: {
        rawIp: req.ip,
      },
    });
  });

  next();
};

export const errorLogger = (err, req, res, next) => {
  logError(err.message, {
    component: 'error-handler',
    error: {
      message: err.message,
      stack: err.stack,
      code: err.code,
    },
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
    ip: req.ip,
  });

  next(err);
};

const flushAndClose = async () => {
  try {
    await flushQueue({ force: true });
  } catch (error) {
    console.error('❌ Failed to flush Elasticsearch queue during shutdown:', elasticErrorReason(error));
  }
};

process.once('beforeExit', () => {
  flushAndClose().catch(() => {});
});

export default {
  initElasticsearch,
  flushQueue,
  getElasticsearchStatus,
  logToElasticsearch,
  logError,
  logInfo,
  logWarning,
  requestLogger,
  errorLogger,
};
