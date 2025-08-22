import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { createError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: admin.auth.DecodedIdToken & {
    uid: string;
    role?: string;
  };
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

    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Get additional user claims (like role)
    const userRecord = await admin.auth().getUser(decodedToken.uid);
    
    // Add custom claims to the request user object
    req.user = {
      ...decodedToken,
      role: userRecord.customClaims?.role || 'client'
    };

    next();
  } catch (error) {
    if (error instanceof Error) {
      next(createError(error.message || 'Invalid token', 401));
    } else {
      next(createError('Authentication failed', 401));
    }
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    if (!roles.includes(req.user.role || 'client')) {
      throw createError('Not authorized to access this route', 403);
    }

    next();
  };
};

// Utility function to set custom claims (role) for users
export const setUserRole = async (uid: string, role: 'client' | 'admin' | 'provider'): Promise<void> => {
  await admin.auth().setCustomUserClaims(uid, { role });
};

// Helper function to get user from Firestore
export const getUserFromFirestore = async (uid: string) => {
  const userDoc = await admin.firestore().collection('users').doc(uid).get();
  if (!userDoc.exists) {
    throw createError('User profile not found', 404);
  }
  return { id: userDoc.id, ...userDoc.data() };
};
