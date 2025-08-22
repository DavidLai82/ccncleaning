import express from 'express';
import { protect, authorize, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { Request, Response, NextFunction } from 'express';

const router = express.Router();

// Get all users (admin only)
const getAllUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    // TODO: Implement get all users from databaseService
    res.json({
      status: 'success',
      message: 'Get all users - Implementation needed',
      data: {
        users: []
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get user by ID (admin only)
const getUserById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    const { id } = req.params;

    // TODO: Implement get user by ID from databaseService
    res.json({
      status: 'success',
      message: 'Get user by ID - Implementation needed',
      data: {
        userId: id
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update user role (admin only)
const updateUserRole = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    const { id } = req.params;
    const { role } = req.body;

    if (!['client', 'admin', 'provider'].includes(role)) {
      throw createError('Invalid role', 400);
    }

    // TODO: Implement update user role
    res.json({
      status: 'success',
      message: 'User role updated',
      data: {
        userId: id,
        newRole: role
      }
    });
  } catch (error) {
    next(error);
  }
};

// Routes (all admin only)
router.get('/', protect, authorize('admin'), getAllUsers);
router.get('/:id', protect, authorize('admin'), getUserById);
router.put('/:id/role', protect, authorize('admin'), updateUserRole);

export default router;
