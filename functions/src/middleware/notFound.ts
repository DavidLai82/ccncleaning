import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler';

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = createError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};
