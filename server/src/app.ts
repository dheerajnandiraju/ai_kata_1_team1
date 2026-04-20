import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import authRouter from './modules/auth/router';
import inventoryRouter from './modules/inventory/router';
import requestsRouter from './modules/requests/router';
import dashboardRouter from './modules/dashboard/router';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/dashboard', dashboardRouter);

app.use(errorHandler);

export default app;
