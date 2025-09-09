import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { notFoundHandler, errorHandler } from './middlewares/error.js';
import authRouter from './routes/auth.routes.js';
import activitiesRouter from './routes/activities.routes.js';
import analyticsRouter from './routes/analytics.routes.js';
import workspacesRouter from './routes/workspaces.routes.js';
import goalsRouter from './routes/goals.routes.js';
import integrationsRouter from './routes/integrations.routes.js';
import invitesRouter from './routes/invites.routes.js';
import swaggerUi from 'swagger-ui-express';
import pino from 'pino';
import pinoHttp from 'pino-http';
import client from 'prom-client';
import notificationsRouter from './routes/notifications.routes.js';
import fs from 'fs';
import path from 'path';
import url from 'url';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const app = express();

// Security & CORS
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'img-src': ["'self'", 'data:', 'blob:'],
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'connect-src': ["'self'"],
    },
  },
}));
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS not allowed'));
  },
  credentials: true,
}));
app.use(cookieParser());

// Parsers
app.use(express.json({ limit: '1mb' }));

// Logging
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
app.use(pinoHttp({ logger }));

// Rate limiting (basic global)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Health
app.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

// Prometheus metrics
client.collectDefaultMetrics();
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/workspaces', workspacesRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/invites', invitesRouter);
app.use('/api/notifications', notificationsRouter);
// Swagger UI
try {
  const spec = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/../docs/openapi.json'), 'utf8'));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));
} catch (e) {
  // ignore if spec missing
}

// 404 and Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;


