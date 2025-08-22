import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import { createError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token: string | undefined;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw createError('Not authorized, no token provided', 401);
    }

    // Verify token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw createError('JWT secret not configured', 500);
    }

    const decoded = jwt.verify(token, jwtSecret) as { id: string };

    // Get user from database
    const user = await User.findById(decoded.id).select('+password');
    if (!user) {
      throw createError('User not found', 401);
    }

    if (!user.isVerified) {
      throw createError('Please verify your email address', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(createError('Invalid token', 401));
    } else {
      next(error);
    }
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    if (!roles.includes(req.user.role)) {
      throw createError('Not authorized to access this route', 403);
    }

    next();
  };
};

export const generateToken = (id: string): string => {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtExpire = process.env.JWT_EXPIRE || '30d';

  if (!jwtSecret) {
    throw new Error('JWT secret not configured');
  }

  return jwt.sign({ id }, jwtSecret, { expiresIn: jwtExpire });
};
