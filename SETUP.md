# CCN Cleaning - Setup Instructions

## 🚀 Quick Setup Guide

### Prerequisites
- Node.js 18+
- Firebase CLI
- Firebase Project (CCN-CLEANING)
- Supabase Project (configured)

### 1. Firebase Setup

#### Connect to Firebase Project
```bash
# In project root
firebase use ccn-cleaning

# Or if project doesn't exist locally
firebase use --add
# Select your CCN-CLEANING project
# Choose alias: default
```

#### Set Firebase Environment Variables
```bash
# Set Supabase configuration for failover
firebase functions:config:set supabase.url="https://ghplwkovzbbwfjdybivu.supabase.co"
firebase functions:config:set supabase.service_key="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdocGx3a292emJid2ZqZHliaXZ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgzMzYzMiwiZXhwIjoyMDcxNDA5NjMyfQ.4xqF_Yb8AeTIW-Px_982N28X7r_-5za-wpGQXhoSZ9k"

# Set Stripe keys (replace with your actual keys)
firebase functions:config:set stripe.secret_key="sk_test_your_key_here"
firebase functions:config:set stripe.publishable_key="pk_test_your_key_here"
```

### 2. Supabase Database Setup

#### Run Database Schema
1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/ghplwkovzbbwfjdybivu
2. Navigate to the SQL Editor
3. Run the contents of `supabase-schema.sql`

### 3. Install Dependencies

#### Firebase Functions
```bash
cd functions
npm install
```

#### Frontend
```bash
cd frontend
npm install
```

### 4. Development

#### Start Firebase Emulators
```bash
# In project root
firebase emulators:start
```

#### Start Frontend (separate terminal)
```bash
cd frontend
npm run dev
```

### 5. Deploy to Production

#### Deploy Functions Only
```bash
firebase deploy --only functions
```

#### Deploy Everything
```bash
firebase deploy
```

### 6. Database Architecture

Your application uses a **dual-database failover system**:

- **Primary**: Firebase Firestore
- **Backup**: Supabase PostgreSQL

#### How it works:
1. **Primary Operations**: All read/write operations attempt Firebase first
2. **Automatic Failover**: If Firebase is unavailable, automatically switches to Supabase
3. **Dual Write**: When using Firebase, also writes to Supabase for backup
4. **Health Monitoring**: Continuous health checks determine active database

#### Database Health Endpoints:
- `GET /api/health` - Overall system health
- Health checks run automatically in the background

### 7. API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/forgot-password` - Reset password

#### Appointments
- `GET /api/appointments` - Get user appointments
- `POST /api/appointments` - Create appointment
- `GET /api/appointments/:id` - Get appointment details
- `PUT /api/appointments/:id/status` - Update status (admin/provider)

#### Payments
- `POST /api/payments/create-intent` - Create payment intent
- `POST /api/payments/confirm` - Confirm payment
- `GET /api/payments` - Get user payments

#### Admin/Users
- `GET /api/users` - Get all users (admin)
- `GET /api/users/:id` - Get user by ID (admin)
- `PUT /api/users/:id/role` - Update user role (admin)

### 8. Frontend Configuration

Create `frontend/.env.local`:
```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ccn-cleaning.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ccn-cleaning
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ccn-cleaning.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# API Endpoints
NEXT_PUBLIC_API_URL=http://localhost:5001/ccn-cleaning/us-central1/api
# For production: https://us-central1-ccn-cleaning.cloudfunctions.net/api

# Supabase (for direct client access if needed)
NEXT_PUBLIC_SUPABASE_URL=https://ghplwkovzbbwfjdybivu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 9. Security Features

✅ **Firebase Authentication** - Primary auth system
✅ **Supabase RLS** - Row-level security for backup database
✅ **JWT Tokens** - Secure API access
✅ **Input Validation** - All endpoints validated
✅ **CORS Protection** - Configured for your frontend
✅ **Rate Limiting** - TODO: Add express-rate-limit
✅ **Helmet Security** - Security headers

### 10. Monitoring & Troubleshooting

#### View Function Logs
```bash
firebase functions:log
```

#### Check Database Health
```bash
curl https://us-central1-ccn-cleaning.cloudfunctions.net/api/health
```

#### Common Issues:
1. **Firebase Auth Error**: Check project configuration
2. **Supabase Connection**: Verify service key in functions config
3. **CORS Issues**: Update CORS origin in functions/src/index.ts
4. **Permission Errors**: Check Firestore rules and Supabase RLS

### 11. Next Steps

1. **Complete Payment Integration**: Implement Stripe webhooks
2. **Email Service**: Set up Nodemailer for notifications
3. **Admin Dashboard**: Build React admin interface
4. **Mobile App**: Consider React Native version
5. **Analytics**: Add Firebase Analytics
6. **Testing**: Add Jest/Cypress test suites

## 🆘 Need Help?

- Check Firebase Console: https://console.firebase.google.com/
- Check Supabase Dashboard: https://supabase.com/dashboard
- Review logs: `firebase functions:log`
- Test endpoints: Use Postman or curl
