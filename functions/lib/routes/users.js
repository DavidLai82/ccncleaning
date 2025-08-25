"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const databaseService_1 = require("../utils/databaseService");
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const router = express_1.default.Router();
// Validation rules
const getUsersValidation = [
    (0, express_validator_1.query)('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('role')
        .optional()
        .isIn(['client', 'admin', 'provider'])
        .withMessage('Role must be client, admin, or provider'),
    (0, express_validator_1.query)('search')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Search term must be less than 100 characters')
];
const updateUserRoleValidation = [
    (0, express_validator_1.param)('id')
        .notEmpty()
        .withMessage('User ID is required'),
    (0, express_validator_1.body)('role')
        .isIn(['client', 'admin', 'provider'])
        .withMessage('Role must be client, admin, or provider')
];
const deleteUserValidation = [
    (0, express_validator_1.param)('id')
        .notEmpty()
        .withMessage('User ID is required')
];
// Get all users (admin only)
const getAllUsers = async (req, res, next) => {
    try {
        if (!req.user) {
            throw (0, errorHandler_1.createError)('User not authenticated', 401);
        }
        // Check for validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw (0, errorHandler_1.createError)('Invalid query parameters', 400);
        }
        const { page = 1, limit = 10, role, search } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const result = await databaseService_1.databaseService.getAllUsers({
            limit: Number(limit),
            offset,
            role: role,
            search: search
        });
        functions.logger.info(`Admin ${req.user.uid} retrieved users list`, {
            page: Number(page),
            limit: Number(limit),
            total: result.total,
            filters: { role, search }
        });
        res.json({
            status: 'success',
            data: {
                users: result.data,
                pagination: {
                    total: result.total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(result.total / Number(limit)),
                    hasNext: offset + Number(limit) < result.total,
                    hasPrev: Number(page) > 1
                }
            }
        });
    }
    catch (error) {
        next(error);
    }
};
// Get user by ID (admin only)
const getUserById = async (req, res, next) => {
    try {
        if (!req.user) {
            throw (0, errorHandler_1.createError)('User not authenticated', 401);
        }
        const { id } = req.params;
        if (!id) {
            throw (0, errorHandler_1.createError)('User ID is required', 400);
        }
        const user = await databaseService_1.databaseService.getUserById(id);
        if (!user) {
            throw (0, errorHandler_1.createError)('User not found', 404);
        }
        // Get additional user statistics
        const appointments = await databaseService_1.databaseService.getUserAppointments(id);
        const payments = await databaseService_1.databaseService.getUserPayments(id);
        const userStats = {
            totalAppointments: appointments.length,
            completedAppointments: appointments.filter(apt => apt.status === 'completed').length,
            totalPayments: payments.length,
            totalSpent: payments
                .filter(payment => payment.status === 'completed')
                .reduce((sum, payment) => sum + payment.amount, 0)
        };
        functions.logger.info(`Admin ${req.user.uid} viewed user details for ${id}`);
        res.json({
            status: 'success',
            data: {
                user,
                statistics: userStats,
                appointments: appointments.slice(0, 5),
                payments: payments.slice(0, 5) // Last 5 payments
            }
        });
    }
    catch (error) {
        next(error);
    }
};
// Update user role (admin only)
const updateUserRole = async (req, res, next) => {
    try {
        if (!req.user) {
            throw (0, errorHandler_1.createError)('User not authenticated', 401);
        }
        // Check for validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw (0, errorHandler_1.createError)('Invalid input data', 400);
        }
        const { id } = req.params;
        const { role } = req.body;
        // Prevent self-role modification
        if (id === req.user.uid) {
            throw (0, errorHandler_1.createError)('Cannot modify your own role', 400);
        }
        // Check if user exists
        const existingUser = await databaseService_1.databaseService.getUserById(id);
        if (!existingUser) {
            throw (0, errorHandler_1.createError)('User not found', 404);
        }
        // Update user role in database
        const updatedUser = await databaseService_1.databaseService.updateUser(id, { role });
        if (!updatedUser) {
            throw (0, errorHandler_1.createError)('Failed to update user role', 500);
        }
        // Update Firebase custom claims
        try {
            await admin.auth().setCustomUserClaims(id, { role });
        }
        catch (firebaseError) {
            functions.logger.warn('Failed to update Firebase custom claims:', firebaseError);
            // Continue even if Firebase claims update fails
        }
        functions.logger.info(`Admin ${req.user.uid} updated role for user ${id}`, {
            oldRole: existingUser.role,
            newRole: role
        });
        res.json({
            status: 'success',
            message: 'User role updated successfully',
            data: {
                user: updatedUser
            }
        });
    }
    catch (error) {
        next(error);
    }
};
// Delete user (admin only)
const deleteUser = async (req, res, next) => {
    try {
        if (!req.user) {
            throw (0, errorHandler_1.createError)('User not authenticated', 401);
        }
        // Check for validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw (0, errorHandler_1.createError)('Invalid input data', 400);
        }
        const { id } = req.params;
        // Prevent self-deletion
        if (id === req.user.uid) {
            throw (0, errorHandler_1.createError)('Cannot delete your own account', 400);
        }
        // Check if user exists
        const existingUser = await databaseService_1.databaseService.getUserById(id);
        if (!existingUser) {
            throw (0, errorHandler_1.createError)('User not found', 404);
        }
        // Prevent deletion of other admins (unless super admin)
        if (existingUser.role === 'admin' && req.user.role !== 'super_admin') {
            throw (0, errorHandler_1.createError)('Cannot delete other admin users', 403);
        }
        // Delete user from database (includes cascading deletes)
        const deleted = await databaseService_1.databaseService.deleteUser(id);
        if (!deleted) {
            throw (0, errorHandler_1.createError)('Failed to delete user', 500);
        }
        // Delete user from Firebase Auth
        try {
            await admin.auth().deleteUser(id);
        }
        catch (firebaseError) {
            functions.logger.warn('Failed to delete user from Firebase Auth:', firebaseError);
            // Continue even if Firebase deletion fails since database cleanup succeeded
        }
        functions.logger.info(`Admin ${req.user.uid} deleted user ${id}`, {
            deletedUser: {
                email: existingUser.email,
                role: existingUser.role
            }
        });
        res.json({
            status: 'success',
            message: 'User deleted successfully'
        });
    }
    catch (error) {
        next(error);
    }
};
// Get user statistics (admin only)
const getUserStats = async (req, res, next) => {
    try {
        if (!req.user) {
            throw (0, errorHandler_1.createError)('User not authenticated', 401);
        }
        // Get all users for statistics
        const allUsers = await databaseService_1.databaseService.getAllUsers({
            limit: 1000,
            offset: 0
        });
        // Calculate statistics
        const stats = {
            total: allUsers.total,
            byRole: {
                client: allUsers.data.filter(user => user.role === 'client').length,
                admin: allUsers.data.filter(user => user.role === 'admin').length,
                provider: allUsers.data.filter(user => user.role === 'provider').length
            },
            verified: allUsers.data.filter(user => user.is_verified).length,
            recentRegistrations: allUsers.data.filter(user => {
                const userDate = new Date(user.created_at);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return userDate >= weekAgo;
            }).length
        };
        functions.logger.info(`Admin ${req.user.uid} viewed user statistics`);
        res.json({
            status: 'success',
            data: {
                statistics: stats
            }
        });
    }
    catch (error) {
        next(error);
    }
};
// Bulk update users (admin only)
const bulkUpdateUsers = async (req, res, next) => {
    try {
        if (!req.user) {
            throw (0, errorHandler_1.createError)('User not authenticated', 401);
        }
        const { userIds, updates } = req.body;
        if (!Array.isArray(userIds) || userIds.length === 0) {
            throw (0, errorHandler_1.createError)('User IDs array is required', 400);
        }
        if (!updates || typeof updates !== 'object') {
            throw (0, errorHandler_1.createError)('Updates object is required', 400);
        }
        // Prevent bulk update of own account
        if (userIds.includes(req.user.uid)) {
            throw (0, errorHandler_1.createError)('Cannot bulk update your own account', 400);
        }
        const results = {
            successful: [],
            failed: []
        };
        // Process updates in parallel
        await Promise.all(userIds.map(async (userId) => {
            try {
                const updatedUser = await databaseService_1.databaseService.updateUser(userId, updates);
                if (updatedUser) {
                    results.successful.push(userId);
                    // Update Firebase custom claims if role is being updated
                    if (updates.role) {
                        try {
                            await admin.auth().setCustomUserClaims(userId, { role: updates.role });
                        }
                        catch (firebaseError) {
                            functions.logger.warn(`Failed to update Firebase claims for ${userId}:`, firebaseError);
                        }
                    }
                }
                else {
                    results.failed.push({ id: userId, error: 'User not found' });
                }
            }
            catch (error) {
                results.failed.push({
                    id: userId,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }));
        functions.logger.info(`Admin ${req.user.uid} performed bulk update`, {
            totalUsers: userIds.length,
            successful: results.successful.length,
            failed: results.failed.length,
            updates
        });
        res.json({
            status: 'success',
            message: `Bulk update completed. ${results.successful.length} successful, ${results.failed.length} failed.`,
            data: {
                results
            }
        });
    }
    catch (error) {
        next(error);
    }
};
// Routes
router.get('/', auth_1.protect, (0, auth_1.authorize)('admin'), getUsersValidation, getAllUsers);
router.get('/stats', auth_1.protect, (0, auth_1.authorize)('admin'), getUserStats);
router.get('/:id', auth_1.protect, (0, auth_1.authorize)('admin'), getUserById);
router.put('/:id/role', auth_1.protect, (0, auth_1.authorize)('admin'), updateUserRoleValidation, updateUserRole);
router.delete('/:id', auth_1.protect, (0, auth_1.authorize)('admin'), deleteUserValidation, deleteUser);
router.put('/bulk-update', auth_1.protect, (0, auth_1.authorize)('admin'), bulkUpdateUsers);
exports.default = router;
//# sourceMappingURL=users.js.map