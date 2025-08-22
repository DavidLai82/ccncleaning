import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Import routes
import authRoutes from './routes/auth';
import appointmentRoutes from './routes/appointments';
import paymentRoutes from './routes/payments';
import userRoutes from './routes/users';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Create Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/payments', paymentRoutes);
app.use('/users', userRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Export the Express app as a Firebase Cloud Function
export const api = functions.https.onRequest(app);

// Additional Firebase Functions can be added here
export const sendWelcomeEmail = functions.auth.user().onCreate(async (user) => {
  const { email, displayName } = user;
  
  // TODO: Implement email sending logic
  console.log(`Welcome email should be sent to ${email} (${displayName})`);
  
  // Create user document in Firestore
  const userRef = admin.firestore().collection('users').doc(user.uid);
  await userRef.set({
    email: email,
    displayName: displayName || '',
    role: 'client',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    isActive: true
  });
});

export const cleanupUserData = functions.auth.user().onDelete(async (user) => {
  // Clean up user data when account is deleted
  const userId = user.uid;
  const batch = admin.firestore().batch();
  
  // Delete user document
  const userRef = admin.firestore().collection('users').doc(userId);
  batch.delete(userRef);
  
  // Delete user's appointments
  const appointmentsSnapshot = await admin.firestore()
    .collection('appointments')
    .where('userId', '==', userId)
    .get();
    
  appointmentsSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  console.log(`Cleaned up data for user ${userId}`);
});
