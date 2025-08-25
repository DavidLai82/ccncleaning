const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Initialize Firebase Admin SDK
admin.initializeApp();

// Create Express app
const app = express();

// Basic middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'https://ccn-cleaning.vercel.app',
    'https://ccncleaning.com'
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Basic auth endpoints
app.post('/auth/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    
    // Create Firebase user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`
    });
    
    // Create custom token
    const customToken = await admin.auth().createCustomToken(userRecord.uid);
    
    res.status(201).json({
      status: 'success',
      data: {
        customToken,
        user: {
          id: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(email);
    
    // Create custom token
    const customToken = await admin.auth().createCustomToken(userRecord.uid);
    
    res.json({
      status: 'success',
      data: {
        customToken,
        user: {
          id: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({
      status: 'error',
      message: 'Invalid credentials'
    });
  }
});

// Basic appointments endpoint
app.get('/appointments', (req, res) => {
  res.json({
    status: 'success',
    data: {
      appointments: []
    }
  });
});

app.post('/appointments', (req, res) => {
  res.json({
    status: 'success',
    message: 'Appointment created successfully',
    data: {
      appointment: {
        id: Date.now().toString(),
        ...req.body,
        status: 'pending',
        createdAt: new Date().toISOString()
      }
    }
  });
});

// Basic payments endpoint
app.get('/payments', (req, res) => {
  res.json({
    status: 'success',
    data: {
      payments: []
    }
  });
});

app.post('/payments/create-intent', (req, res) => {
  res.json({
    status: 'success',
    data: {
      clientSecret: 'pi_test_' + Date.now()
    }
  });
});

// Basic users endpoint
app.get('/users', (req, res) => {
  res.json({
    status: 'success',
    data: {
      users: []
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Export the Express app as a Firebase Cloud Function
exports.api = functions.https.onRequest(app);

// Basic Firebase Auth triggers
exports.sendWelcomeEmail = functions.auth.user().onCreate(async (user) => {
  console.log('New user created:', user.email);
  // TODO: Send welcome email
});

exports.cleanupUserData = functions.auth.user().onDelete(async (user) => {
  console.log('User deleted:', user.uid);
  // TODO: Cleanup user data
});