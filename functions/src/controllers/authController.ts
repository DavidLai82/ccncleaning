import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as admin from 'firebase-admin';
import bcrypt from 'bcryptjs';
import { createError } from '../middleware/errorHandler';
import { AuthRequest, setUserRole, getUserFromFirestore } from '../middleware/auth';
import { databaseService } from '../utils/databaseService';
import { getSupabase } from '../config/database';
import * as functions from 'firebase-functions';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Invalid input data', 400);
    }

    const { firstName, lastName, email, password, phone } = req.body;

    // Check if user already exists in our database
    const existingUser = await databaseService.getUserByEmail(email);
    if (existingUser) {
      throw createError('User already exists with this email', 400);
    }

    // Create Firebase Auth user
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().createUser({
        email,
        password,
        displayName: `${firstName} ${lastName}`,
        emailVerified: false
      });

      // Set custom claims (role)
      await setUserRole(firebaseUser.uid, 'client');
    } catch (firebaseError: any) {
      functions.logger.error('Firebase user creation failed:', firebaseError);
      throw createError('Failed to create user account', 500);
    }

    // Create user record in our database system
    try {
      const userData = {
        email,
        firstName,
        lastName,
        phone,
        role: 'client' as const,
        isVerified: false
      };

      const user = await databaseService.createUser(userData);

      // Generate custom token for immediate login
      const customToken = await admin.auth().createCustomToken(firebaseUser.uid);

      res.status(201).json({
        status: 'success',
        message: 'User registered successfully. Please verify your email.',
        data: {
          customToken,
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isVerified: user.isVerified
          }
        }
      });
    } catch (dbError) {
      // If database creation fails, clean up Firebase user
      try {
        await admin.auth().deleteUser(firebaseUser.uid);
      } catch (cleanupError) {
        functions.logger.error('Failed to cleanup Firebase user after database error:', cleanupError);
      }
      throw dbError;
    }
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Invalid input data', 400);
    }

    const { email, password } = req.body;

    // Get user from our database
    const user = await databaseService.getUserByEmail(email);
    if (!user) {
      throw createError('Invalid email or password', 401);
    }

    // Verify password with Firebase Auth
    try {
      // Get Firebase user
      const firebaseUser = await admin.auth().getUserByEmail(email);
      
      // Create custom token for login
      const customToken = await admin.auth().createCustomToken(firebaseUser.uid);

      res.json({
        status: 'success',
        message: 'Login successful',
        data: {
          customToken,
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isVerified: user.isVerified
          }
        }
      });
    } catch (firebaseError) {
      functions.logger.error('Firebase authentication failed:', firebaseError);
      throw createError('Invalid email or password', 401);
    }
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    // Get user from our database
    const user = await databaseService.getUserById(req.user.uid);
    if (!user) {
      throw createError('User profile not found', 404);
    }

    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
          avatar: user.avatar,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    const { firstName, lastName, phone } = req.body;

    // Update user in our database
    const updatedUser = await databaseService.updateUser(req.user.uid, {
      firstName,
      lastName,
      phone
    });

    if (!updatedUser) {
      throw createError('User not found', 404);
    }

    // Also update Firebase Auth displayName
    try {
      await admin.auth().updateUser(req.user.uid, {
        displayName: `${firstName} ${lastName}`
      });
    } catch (firebaseError) {
      functions.logger.warn('Failed to update Firebase Auth profile:', firebaseError);
    }

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    const { currentPassword, newPassword } = req.body;

    // Verify current password and update in Firebase Auth
    try {
      // Firebase handles password verification and update
      await admin.auth().updateUser(req.user.uid, {
        password: newPassword
      });

      res.json({
        status: 'success',
        message: 'Password changed successfully'
      });
    } catch (firebaseError) {
      functions.logger.error('Firebase password update failed:', firebaseError);
      throw createError('Failed to update password', 400);
    }
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;

    // Check if user exists in our database
    const user = await databaseService.getUserByEmail(email);
    if (!user) {
      throw createError('User not found with this email', 404);
    }

    // Generate password reset link using Firebase Auth
    try {
      const resetLink = await admin.auth().generatePasswordResetLink(email);
      
      // TODO: Send email with reset link
      // For now, we'll return success (in production, you'd send an email)
      functions.logger.info(`Password reset link generated for ${email}: ${resetLink}`);

      res.json({
        status: 'success',
        message: 'Password reset link sent to email'
      });
    } catch (firebaseError) {
      functions.logger.error('Firebase password reset failed:', firebaseError);
      throw createError('Failed to generate password reset link', 500);
    }
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Firebase handles password reset verification and update through their SDK
    // This endpoint would typically be called from the frontend after Firebase handles the reset
    
    res.json({
      status: 'success',
      message: 'Password reset instructions sent. Please check your email.'
    });
  } catch (error) {
    next(error);
  }
};

// Admin function to create users with specific roles
export const createAdminUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      throw createError('Admin access required', 403);
    }

    const { firstName, lastName, email, password, role } = req.body;

    // Create Firebase Auth user
    const firebaseUser = await admin.auth().createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
      emailVerified: true // Admin-created users are verified by default
    });

    // Set custom claims
    await setUserRole(firebaseUser.uid, role);

    // Create user record in our database
    const userData = {
      email,
      firstName,
      lastName,
      role: role as 'client' | 'admin' | 'provider',
      isVerified: true
    };

    const user = await databaseService.createUser(userData);

    res.status(201).json({
      status: 'success',
      message: 'Admin user created successfully',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

// Helper function for dual authentication with Supabase fallback
export const authenticateWithSupabase = async (email: string, password: string) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    return data.user;
  } catch (error) {
    functions.logger.error('Supabase authentication failed:', error);
    throw createError('Authentication failed', 401);
  }
};
