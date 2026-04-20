import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  const statusCode = err.status ?? 500;
  res.status(statusCode).json({ message: err.message || 'Internal Server Error' });
};
