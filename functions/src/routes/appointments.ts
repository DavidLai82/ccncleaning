import express from 'express';
import { body } from 'express-validator';
import { protect, authorize, AuthRequest } from '../middleware/auth';
import { databaseService } from '../utils/databaseService';
import { createError } from '../middleware/errorHandler';
import { validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

const router = express.Router();

// Validation rules
const createAppointmentValidation = [
  body('serviceType')
    .notEmpty()
    .withMessage('Service type is required'),
  body('appointmentDate')
    .isISO8601()
    .withMessage('Valid appointment date is required'),
  body('address')
    .notEmpty()
    .withMessage('Address is required'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

// Get all appointments for the authenticated user
const getUserAppointments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    const appointments = await databaseService.getUserAppointments(req.user.uid);

    res.json({
      status: 'success',
      data: {
        appointments
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create a new appointment
const createAppointment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Invalid input data', 400);
    }

    const { serviceType, appointmentDate, address, notes } = req.body;

    const appointmentData = {
      userId: req.user.uid,
      serviceType,
      appointmentDate: new Date(appointmentDate),
      status: 'pending' as const,
      address,
      notes
    };

    const appointment = await databaseService.createAppointment(appointmentData);

    res.status(201).json({
      status: 'success',
      message: 'Appointment created successfully',
      data: {
        appointment
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get appointment by ID
const getAppointmentById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    const { id } = req.params;

    // For now, this is a placeholder - you'd implement getAppointmentById in databaseService
    res.json({
      status: 'success',
      message: 'Get appointment by ID - Implementation needed',
      data: {
        appointmentId: id
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update appointment status (admin/provider only)
const updateAppointmentStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      throw createError('Invalid status', 400);
    }

    // Implementation needed in databaseService
    res.json({
      status: 'success',
      message: 'Appointment status updated',
      data: {
        appointmentId: id,
        newStatus: status
      }
    });
  } catch (error) {
    next(error);
  }
};

// Routes
router.get('/', protect, getUserAppointments);
router.post('/', protect, createAppointmentValidation, createAppointment);
router.get('/:id', protect, getAppointmentById);
router.put('/:id/status', protect, authorize('admin', 'provider'), updateAppointmentStatus);

export default router;
