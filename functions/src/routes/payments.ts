import express from 'express';
import { body, validationResult } from 'express-validator';
import { protect, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { Request, Response, NextFunction } from 'express';
import { databaseService } from '../utils/databaseService';
import * as functions from 'firebase-functions';
import Stripe from 'stripe';

const router = express.Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || functions.config().stripe?.secret_key || '');

// Validation rules
const createPaymentValidation = [
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Valid amount greater than 0 is required'),
  body('appointmentId')
    .notEmpty()
    .withMessage('Appointment ID is required'),
  body('currency')
    .optional()
    .isIn(['cad', 'usd'])
    .withMessage('Currency must be CAD or USD')
];

const confirmPaymentValidation = [
  body('paymentIntentId')
    .notEmpty()
    .withMessage('Payment intent ID is required')
];

// Create payment intent
const createPaymentIntent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Invalid input data', 400);
    }

    const { amount, currency = 'cad', appointmentId } = req.body;

    // Verify appointment belongs to user
    const appointments = await databaseService.getUserAppointments(req.user.uid);
    const appointment = appointments.find(apt => apt.id === appointmentId);
    
    if (!appointment) {
      throw createError('Appointment not found or access denied', 404);
    }

    // Check if payment already exists for this appointment
    const existingPayments = await databaseService.getUserPayments(req.user.uid);
    const existingPayment = existingPayments.find(payment => 
      payment.appointmentId === appointmentId && 
      ['pending', 'completed'].includes(payment.status)
    );

    if (existingPayment) {
      throw createError('Payment already exists for this appointment', 400);
    }

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
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
    const payment = await databaseService.createPayment({
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
  } catch (error) {
    next(error);
  }
};

// Confirm payment
const confirmPayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Invalid input data', 400);
    }

    const { paymentIntentId } = req.body;

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent) {
      throw createError('Payment intent not found', 404);
    }

    // Verify the payment belongs to the authenticated user
    if (paymentIntent.metadata.userId !== req.user.uid) {
      throw createError('Unauthorized access to payment', 403);
    }

    let paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded' = 'pending';
    let appointmentStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled' = 'pending';

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
    await databaseService.updatePaymentStatus(paymentIntentId, paymentStatus);
    
    // Update appointment status if payment succeeded
    const appointmentId = paymentIntent.metadata.appointmentId;
    if (appointmentId && paymentStatus === 'completed') {
      await databaseService.updateAppointmentStatus(appointmentId, appointmentStatus);
      
      // Get user details for email
      const user = await databaseService.getUserById(req.user.uid);
      const appointments = await databaseService.getUserAppointments(req.user.uid);
      const appointment = appointments.find(apt => apt.id === appointmentId);
      
      if (user && appointment) {
        // Send appointment confirmation email
        const { emailService } = await import('../services/emailService');
        await emailService.sendAppointmentConfirmation(
          user.email,
          `${user.first_name} ${user.last_name}`,
          {
            serviceType: appointment.serviceType,
            appointmentDate: appointment.appointmentDate,
            address: appointment.address,
            notes: appointment.notes
          }
        );
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
  } catch (error) {
    next(error);
  }
};

// Get user payments
const getUserPayments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    const payments = await databaseService.getUserPayments(req.user.uid);

    res.json({
      status: 'success',
      data: {
        payments
      }
    });
  } catch (error) {
    next(error);
  }
};

// Webhook endpoint for Stripe events
const handleWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || functions.config().stripe?.webhook_secret;

    if (!webhookSecret) {
      throw createError('Webhook secret not configured', 500);
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      functions.logger.error('Webhook signature verification failed:', err);
      throw createError('Invalid webhook signature', 400);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await databaseService.updatePaymentStatus(paymentIntent.id, 'completed');
        
        // Update appointment status
        const appointmentId = paymentIntent.metadata.appointmentId;
        if (appointmentId) {
          await databaseService.updateAppointmentStatus(appointmentId, 'confirmed');
        }
        
        functions.logger.info('Payment succeeded:', paymentIntent.id);
        break;
        
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        await databaseService.updatePaymentStatus(failedPayment.id, 'failed');
        functions.logger.warn('Payment failed:', failedPayment.id);
        break;
        
      default:
        functions.logger.info(`Unhandled webhook event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
};

// Routes
router.post('/create-intent', protect, createPaymentValidation, createPaymentIntent);
router.post('/confirm', protect, confirmPaymentValidation, confirmPayment);
router.get('/', protect, getUserPayments);
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

export default router;
