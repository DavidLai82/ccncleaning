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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const databaseService_1 = require("../utils/databaseService");
const functions = __importStar(require("firebase-functions"));
const stripe_1 = __importDefault(require("stripe"));
const router = express_1.default.Router();
// Initialize Stripe
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || ((_a = functions.config().stripe) === null || _a === void 0 ? void 0 : _a.secret_key) || '');
// Validation rules
const createPaymentValidation = [
    (0, express_validator_1.body)('amount')
        .isFloat({ min: 1 })
        .withMessage('Valid amount greater than 0 is required'),
    (0, express_validator_1.body)('appointmentId')
        .notEmpty()
        .withMessage('Appointment ID is required'),
    (0, express_validator_1.body)('currency')
        .optional()
        .isIn(['cad', 'usd'])
        .withMessage('Currency must be CAD or USD')
];
const confirmPaymentValidation = [
    (0, express_validator_1.body)('paymentIntentId')
        .notEmpty()
        .withMessage('Payment intent ID is required')
];
// Create payment intent
const createPaymentIntent = async (req, res, next) => {
    try {
        if (!req.user) {
            throw (0, errorHandler_1.createError)('User not authenticated', 401);
        }
        // Check for validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw (0, errorHandler_1.createError)('Invalid input data', 400);
        }
        const { amount, currency = 'cad', appointmentId } = req.body;
        // Verify appointment belongs to user
        const appointments = await databaseService_1.databaseService.getUserAppointments(req.user.uid);
        const appointment = appointments.find(apt => apt.id === appointmentId);
        if (!appointment) {
            throw (0, errorHandler_1.createError)('Appointment not found or access denied', 404);
        }
        // Check if payment already exists for this appointment
        const existingPayments = await databaseService_1.databaseService.getUserPayments(req.user.uid);
        const existingPayment = existingPayments.find(payment => payment.appointmentId === appointmentId &&
            ['pending', 'completed'].includes(payment.status));
        if (existingPayment) {
            throw (0, errorHandler_1.createError)('Payment already exists for this appointment', 400);
        }
        // Create payment intent with Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency: currency.toLowerCase(),
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                appointmentId,
                userId: req.user.uid,
                serviceType: appointment.serviceType
            }
        });
        // Save payment record in database
        const payment = await databaseService_1.databaseService.createPayment({
            userId: req.user.uid,
            appointmentId,
            amount,
            currency,
            status: 'pending',
            stripePaymentIntentId: paymentIntent.id
        });
        functions.logger.info(`Payment intent created for user ${req.user.uid}`, {
            paymentId: payment.id,
            amount,
            appointmentId
        });
        res.json({
            status: 'success',
            message: 'Payment intent created successfully',
            data: {
                clientSecret: paymentIntent.client_secret,
                paymentId: payment.id
            }
        });
    }
    catch (error) {
        next(error);
    }
};
// Confirm payment
const confirmPayment = async (req, res, next) => {
    try {
        if (!req.user) {
            throw (0, errorHandler_1.createError)('User not authenticated', 401);
        }
        // Check for validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw (0, errorHandler_1.createError)('Invalid input data', 400);
        }
        const { paymentIntentId } = req.body;
        // Retrieve payment intent from Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (!paymentIntent) {
            throw (0, errorHandler_1.createError)('Payment intent not found', 404);
        }
        // Verify the payment belongs to the authenticated user
        if (paymentIntent.metadata.userId !== req.user.uid) {
            throw (0, errorHandler_1.createError)('Unauthorized access to payment', 403);
        }
        let paymentStatus = 'pending';
        let appointmentStatus = 'pending';
        // Update payment and appointment status based on Stripe status
        switch (paymentIntent.status) {
            case 'succeeded':
                paymentStatus = 'completed';
                appointmentStatus = 'confirmed';
                break;
            case 'canceled':
                paymentStatus = 'failed';
                appointmentStatus = 'pending';
                break;
            case 'processing':
            case 'requires_payment_method':
            case 'requires_confirmation':
                paymentStatus = 'pending';
                appointmentStatus = 'pending';
                break;
            default:
                paymentStatus = 'pending';
        }
        // Update payment status in database
        await databaseService_1.databaseService.updatePaymentStatus(paymentIntentId, paymentStatus);
        // Update appointment status if payment succeeded
        const appointmentId = paymentIntent.metadata.appointmentId;
        if (appointmentId && paymentStatus === 'completed') {
            await databaseService_1.databaseService.updateAppointmentStatus(appointmentId, appointmentStatus);
            // Get user details for email
            const user = await databaseService_1.databaseService.getUserById(req.user.uid);
            const appointments = await databaseService_1.databaseService.getUserAppointments(req.user.uid);
            const appointment = appointments.find(apt => apt.id === appointmentId);
            if (user && appointment) {
                // Send appointment confirmation email
                const { emailService } = await Promise.resolve().then(() => __importStar(require('../services/emailService')));
                await emailService.sendAppointmentConfirmation(user.email, `${user.first_name} ${user.last_name}`, {
                    serviceType: appointment.serviceType,
                    appointmentDate: appointment.appointmentDate,
                    address: appointment.address,
                    notes: appointment.notes
                });
            }
        }
        functions.logger.info(`Payment confirmed for user ${req.user.uid}`, {
            paymentIntentId,
            status: paymentStatus,
            appointmentId
        });
        res.json({
            status: 'success',
            message: 'Payment processed successfully',
            data: {
                paymentStatus,
                appointmentStatus,
                stripeStatus: paymentIntent.status
            }
        });
    }
    catch (error) {
        next(error);
    }
};
// Get user payments
const getUserPayments = async (req, res, next) => {
    try {
        if (!req.user) {
            throw (0, errorHandler_1.createError)('User not authenticated', 401);
        }
        const payments = await databaseService_1.databaseService.getUserPayments(req.user.uid);
        res.json({
            status: 'success',
            data: {
                payments
            }
        });
    }
    catch (error) {
        next(error);
    }
};
// Webhook endpoint for Stripe events
const handleWebhook = async (req, res, next) => {
    var _a;
    try {
        const sig = req.headers['stripe-signature'];
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ((_a = functions.config().stripe) === null || _a === void 0 ? void 0 : _a.webhook_secret);
        if (!webhookSecret) {
            throw (0, errorHandler_1.createError)('Webhook secret not configured', 500);
        }
        let event;
        try {
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        }
        catch (err) {
            functions.logger.error('Webhook signature verification failed:', err);
            throw (0, errorHandler_1.createError)('Invalid webhook signature', 400);
        }
        // Handle the event
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                await databaseService_1.databaseService.updatePaymentStatus(paymentIntent.id, 'completed');
                // Update appointment status
                const appointmentId = paymentIntent.metadata.appointmentId;
                if (appointmentId) {
                    await databaseService_1.databaseService.updateAppointmentStatus(appointmentId, 'confirmed');
                }
                functions.logger.info('Payment succeeded:', paymentIntent.id);
                break;
            case 'payment_intent.payment_failed':
                const failedPayment = event.data.object;
                await databaseService_1.databaseService.updatePaymentStatus(failedPayment.id, 'failed');
                functions.logger.warn('Payment failed:', failedPayment.id);
                break;
            default:
                functions.logger.info(`Unhandled webhook event type: ${event.type}`);
        }
        res.json({ received: true });
    }
    catch (error) {
        next(error);
    }
};
// Routes
router.post('/create-intent', auth_1.protect, createPaymentValidation, createPaymentIntent);
router.post('/confirm', auth_1.protect, confirmPaymentValidation, confirmPayment);
router.get('/', auth_1.protect, getUserPayments);
router.post('/webhook', express_1.default.raw({ type: 'application/json' }), handleWebhook);
exports.default = router;
//# sourceMappingURL=payments.js.map