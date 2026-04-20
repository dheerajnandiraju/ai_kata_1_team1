import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Unhandled error:', err);
  const status: number = err.status || err.statusCode || 500;
  const message: string = err.message || 'Internal Server Error';
  res.status(status).json({ message });
}
