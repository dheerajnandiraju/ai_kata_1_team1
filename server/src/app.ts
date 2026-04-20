import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import authRouter from './modules/auth/router';
import inventoryRouter from './modules/inventory/router';
import requestsRouter from './modules/requests/router';
import dashboardRouter from './modules/dashboard/router';
import usersRouter from './modules/users/router';

const app = express();

// Security headers
app.use(helmet());

// CORS — restricted to configured origin
app.use(cors({
  origin: env.CLIENT_ORIGIN,
  credentials: true,
}));

// Prevent qs deep-object parsing — stops ?field[$ne]=x NoSQL injection
app.set('query parser', 'simple');

app.use(express.json());
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limiter for authentication endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/users', usersRouter);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
