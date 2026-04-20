import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const status = err.statusCode ?? 500;
  // Do not leak internal error details on 5xx responses
  const message = status >= 500 ? 'Internal Server Error' : (err.message ?? 'Internal Server Error');

  if (status >= 500) {
    console.error('[Error]', err);
  }

  res.status(status).json({ message });
}

export function createError(message: string, statusCode: number): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  return err;
}
