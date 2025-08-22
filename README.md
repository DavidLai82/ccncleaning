# CCN Cleaning Service

A comprehensive cleaning service booking application built with Next.js and Firebase.

## 🚀 Features

- User authentication and authorization
- Service booking and scheduling
- Payment processing integration
- Admin dashboard
- Responsive design
- Real-time updates

## 🛠 Tech Stack

### Frontend
- **Next.js** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling (planned)

### Backend
- **Firebase Authentication** - User management
- **Firestore** - NoSQL database
- **Cloud Functions** - Serverless backend
- **Firebase Storage** - File storage

### Payment
- **Stripe** - Payment processing

## 📁 Project Structure

```
CCN-CLEANING/
├── frontend/           # Next.js frontend application
├── backend/           # Firebase Cloud Functions (migrated from Express)
├── firebase.json      # Firebase configuration
├── firestore.rules    # Firestore security rules
└── README.md
```

## 🏗 Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- Firebase CLI
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd CCN-CLEANING
```

2. Install dependencies for frontend:
```bash
cd frontend
npm install
```

3. Install Firebase CLI globally:
```bash
npm install -g firebase-tools
```

4. Login to Firebase:
```bash
firebase login
```

5. Initialize Firebase project:
```bash
firebase init
```

### Environment Variables

Create `.env.local` files in both frontend and functions directories:

#### Frontend (.env.local)
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## 🚀 Development

### Frontend Development
```bash
cd frontend
npm run dev
```

### Firebase Functions Development
```bash
cd backend
npm run serve
```

### Deploy to Firebase
```bash
firebase deploy
```

## 📝 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Booking Endpoints
- `GET /api/appointments` - Get user appointments
- `POST /api/appointments` - Create new appointment
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Cancel appointment

### Payment Endpoints
- `POST /api/payments/create-intent` - Create payment intent
- `POST /api/payments/confirm` - Confirm payment

## 🔐 Security

- Firebase Authentication for user management
- Firestore Security Rules for data protection
- Input validation and sanitization
- HTTPS-only communication

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@ccncleaning.com or create an issue in the repository.
