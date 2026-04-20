import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const error = err as { status?: number; message?: string };
  const status = error.status ?? 500;
  const message = error.message ?? 'Internal Server Error';
  if (status >= 500) console.error('[Error]', err);
  return res.status(status).json({ error: message });
}
