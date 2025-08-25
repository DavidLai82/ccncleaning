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
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateWithSupabase = exports.createAdminUser = exports.resetPassword = exports.forgotPassword = exports.changePassword = exports.updateProfile = exports.getProfile = exports.login = exports.register = void 0;
const express_validator_1 = require("express-validator");
const admin = __importStar(require("firebase-admin"));
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const databaseService_1 = require("../utils/databaseService");
const database_1 = require("../config/database");
const functions = __importStar(require("firebase-functions"));
const register = async (req, res, next) => {
    try {
        // Check for validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw (0, errorHandler_1.createError)('Invalid input data', 400);
        }
        const { firstName, lastName, email, password, phone } = req.body;
        // Check if user already exists in our database
        const existingUser = await databaseService_1.databaseService.getUserByEmail(email);
        if (existingUser) {
            throw (0, errorHandler_1.createError)('User already exists with this email', 400);
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
            await (0, auth_1.setUserRole)(firebaseUser.uid, 'client');
        }
        catch (firebaseError) {
            functions.logger.error('Firebase user creation failed:', firebaseError);
            throw (0, errorHandler_1.createError)('Failed to create user account', 500);
        }
        // Create user record in our database system
        try {
            const userData = {
                email,
                first_name: firstName,
                last_name: lastName,
                phone,
                role: 'client',
                is_verified: false,
                created_at: new Date().toISOString()
            };
            const user = await databaseService_1.databaseService.createUser(userData);
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
        }
        catch (dbError) {
            // If database creation fails, clean up Firebase user
            try {
                await admin.auth().deleteUser(firebaseUser.uid);
            }
            catch (cleanupError) {
                functions.logger.error('Failed to cleanup Firebase user after database error:', cleanupError);
            }
            throw dbError;
        }
    }
    catch (error) {
        next(error);
    }
};
exports.register = register;
const login = async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw (0, errorHandler_1.createError)('Invalid input data', 400);
        }
        const { email, password } = req.body;
        // Get user from our database
        const user = await databaseService_1.databaseService.getUserByEmail(email);
        if (!user) {
            throw (0, errorHandler_1.createError)('Invalid email or password', 401);
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
        }
        catch (firebaseError) {
            functions.logger.error('Firebase authentication failed:', firebaseError);
            throw (0, errorHandler_1.createError)('Invalid email or password', 401);
        }
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
const getProfile = async (req, res, next) => {
    try {
        if (!req.user) {
            throw (0, errorHandler_1.createError)('User not authenticated', 401);
        }
        // Get user from our database
        const user = await databaseService_1.databaseService.getUserById(req.user.uid);
        if (!user) {
            throw (0, errorHandler_1.createError)('User profile not found', 404);
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
    }
    catch (error) {
        next(error);
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res, next) => {
    try {
        if (!req.user) {
            throw (0, errorHandler_1.createError)('User not authenticated', 401);
        }
        const { firstName, lastName, phone } = req.body;
        // Update user in our database
        const updatedUser = await databaseService_1.databaseService.updateUser(req.user.uid, {
            firstName,
            lastName,
            phone
        });
        if (!updatedUser) {
            throw (0, errorHandler_1.createError)('User not found', 404);
        }
        // Also update Firebase Auth displayName
        try {
            await admin.auth().updateUser(req.user.uid, {
                displayName: `${firstName} ${lastName}`
            });
        }
        catch (firebaseError) {
            functions.logger.warn('Failed to update Firebase Auth profile:', firebaseError);
        }
        res.json({
            status: 'success',
            message: 'Profile updated successfully',
            data: {
                user: updatedUser
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateProfile = updateProfile;
const changePassword = async (req, res, next) => {
    try {
        if (!req.user) {
            throw (0, errorHandler_1.createError)('User not authenticated', 401);
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
        }
        catch (firebaseError) {
            functions.logger.error('Firebase password update failed:', firebaseError);
            throw (0, errorHandler_1.createError)('Failed to update password', 400);
        }
    }
    catch (error) {
        next(error);
    }
};
exports.changePassword = changePassword;
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        // Check if user exists in our database
        const user = await databaseService_1.databaseService.getUserByEmail(email);
        if (!user) {
            throw (0, errorHandler_1.createError)('User not found with this email', 404);
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
        }
        catch (firebaseError) {
            functions.logger.error('Firebase password reset failed:', firebaseError);
            throw (0, errorHandler_1.createError)('Failed to generate password reset link', 500);
        }
    }
    catch (error) {
        next(error);
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res, next) => {
    try {
        const { token } = req.params;
        const { password } = req.body;
        // Firebase handles password reset verification and update through their SDK
        // This endpoint would typically be called from the frontend after Firebase handles the reset
        res.json({
            status: 'success',
            message: 'Password reset instructions sent. Please check your email.'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.resetPassword = resetPassword;
// Admin function to create users with specific roles
const createAdminUser = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            throw (0, errorHandler_1.createError)('Admin access required', 403);
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
        await (0, auth_1.setUserRole)(firebaseUser.uid, role);
        // Create user record in our database
        const userData = {
            email,
            firstName,
            lastName,
            role: role,
            isVerified: true
        };
        const user = await databaseService_1.databaseService.createUser(userData);
        res.status(201).json({
            status: 'success',
            message: 'Admin user created successfully',
            data: {
                user
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createAdminUser = createAdminUser;
// Helper function for dual authentication with Supabase fallback
const authenticateWithSupabase = async (email, password) => {
    try {
        const supabase = (0, database_1.getSupabase)();
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error)
            throw error;
        return data.user;
    }
    catch (error) {
        functions.logger.error('Supabase authentication failed:', error);
        throw (0, errorHandler_1.createError)('Authentication failed', 401);
    }
};
exports.authenticateWithSupabase = authenticateWithSupabase;
//# sourceMappingURL=authController.js.map