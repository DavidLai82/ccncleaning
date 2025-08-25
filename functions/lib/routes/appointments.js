"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const databaseService_1 = require("../utils/databaseService");
const errorHandler_1 = require("../middleware/errorHandler");
const express_validator_2 = require("express-validator");
const router = express_1.default.Router();
// Validation rules
const createAppointmentValidation = [
    (0, express_validator_1.body)('serviceType')
        .notEmpty()
        .withMessage('Service type is required'),
    (0, express_validator_1.body)('appointmentDate')
        .isISO8601()
        .withMessage('Valid appointment date is required'),
    (0, express_validator_1.body)('address')
        .notEmpty()
        .withMessage('Address is required'),
    (0, express_validator_1.body)('notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Notes cannot exceed 500 characters')
];
// Get all appointments for the authenticated user
const getUserAppointments = async (req, res, next) => {
    try {
        if (!req.user) {
            throw (0, errorHandler_1.createError)('User not authenticated', 401);
        }
        const appointments = await databaseService_1.databaseService.getUserAppointments(req.user.uid);
        res.json({
            status: 'success',
            data: {
                appointments
            }
        });
    }
    catch (error) {
        next(error);
    }
};
// Create a new appointment
const createAppointment = async (req, res, next) => {
    try {
        if (!req.user) {
            throw (0, errorHandler_1.createError)('User not authenticated', 401);
        }
        const errors = (0, express_validator_2.validationResult)(req);
        if (!errors.isEmpty()) {
            throw (0, errorHandler_1.createError)('Invalid input data', 400);
        }
        const { serviceType, appointmentDate, address, notes } = req.body;
        const appointmentData = {
            userId: req.user.uid,
            serviceType,
            appointmentDate: new Date(appointmentDate),
            status: 'pending',
            address,
            notes
        };
        const appointment = await databaseService_1.databaseService.createAppointment(appointmentData);
        res.status(201).json({
            status: 'success',
            message: 'Appointment created successfully',
            data: {
                appointment
            }
        });
    }
    catch (error) {
        next(error);
    }
};
// Get appointment by ID
const getAppointmentById = async (req, res, next) => {
    try {
        if (!req.user) {
            throw (0, errorHandler_1.createError)('User not authenticated', 401);
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
    }
    catch (error) {
        next(error);
    }
};
// Update appointment status (admin/provider only)
const updateAppointmentStatus = async (req, res, next) => {
    try {
        if (!req.user) {
            throw (0, errorHandler_1.createError)('User not authenticated', 401);
        }
        const { id } = req.params;
        const { status } = req.body;
        if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
            throw (0, errorHandler_1.createError)('Invalid status', 400);
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
    }
    catch (error) {
        next(error);
    }
};
// Routes
router.get('/', auth_1.protect, getUserAppointments);
router.post('/', auth_1.protect, createAppointmentValidation, createAppointment);
router.get('/:id', auth_1.protect, getAppointmentById);
router.put('/:id/status', auth_1.protect, (0, auth_1.authorize)('admin', 'provider'), updateAppointmentStatus);
exports.default = router;
//# sourceMappingURL=appointments.js.map