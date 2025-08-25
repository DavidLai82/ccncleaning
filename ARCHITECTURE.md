# CCN Cleaning - Architecture Documentation

## Overview
CCN Cleaning uses a modern serverless architecture with Firebase as the primary backend and Supabase as a backup/failover database.

## Backend Architecture

### Firebase Cloud Functions (Primary Backend)
- **Location**: `/functions/`
- **Technology**: Firebase Cloud Functions with Express.js
- **Database**: Firebase Firestore (primary) + Supabase PostgreSQL (backup)
- **Authentication**: Firebase Auth
- **Deployment**: `firebase deploy`

### Dual Database System
The application implements a robust failover system:

1. **Primary Database**: Firebase Firestore
   - All operations attempt Firestore first
   - Automatic backup to Supabase on writes

2. **Backup Database**: Supabase PostgreSQL  
   - Automatically used when Firestore is unavailable
   - Complete schema in `supabase-schema.sql`
   - Row Level Security (RLS) enabled

### Data Models
All data models use consistent field naming (snake_case) to match the Supabase schema:

```typescript
interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar?: string;
  role: 'client' | 'admin' | 'provider';
  is_verified: boolean;
  created_at: any;
  updated_at?: any;
}
```

## Frontend Architecture

### Next.js Application
- **Location**: `/frontend/`
- **Technology**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS with custom design system
- **3D Graphics**: Three.js with React Three Fiber
- **Animations**: Framer Motion

### Component Structure
```
src/
├── app/                 # Next.js App Router
├── components/
│   ├── UI/             # Business UI components
│   ├── 3D/             # Three.js 3D components
│   ├── ClientOnly.tsx  # Client-side rendering wrapper
│   └── ErrorBoundary.tsx
├── hooks/              # Custom React hooks
└── utils/              # Utility functions
```

### Design System
- **Primary Colors**: Purple → Pink → Orange gradient
- **Typography**: Geist Sans font family
- **Components**: Consistent button styles, hover effects, and spacing
- **Responsive**: Mobile-first design with Tailwind breakpoints

## Key Features

### 3D Interactive Background
- Three.js scene with floating geometric shapes
- Auto-rotating camera with user interaction controls
- Graceful fallback on WebGL errors
- Client-side only rendering to prevent SSR issues

### Professional Business Styling
- Clean, modern design with professional color scheme
- Orange accent color for primary actions
- Comprehensive contact information and service areas
- Trust signals (25+ years, insured, bonded)

### Contact Integration
- Direct phone links: `tel:+14162718486`
- Email integration: `mailto:info@ccncleaning.com`
- Smooth scrolling navigation between sections
- Call-to-action buttons throughout the site

## Development Guidelines

### DO NOT:
- Create additional backend directories (like `/backend/`)
- Mix different database field naming conventions
- Add duplicate authentication systems
- Remove error boundaries or client-only wrappers

### DO:
- Use the existing Firebase Functions architecture
- Follow the established snake_case field naming
- Maintain the dual-database failover system
- Test on both database systems
- Keep the professional business styling consistent

## Deployment

### Development
```bash
# Start frontend
cd frontend && npm run dev

# Start Firebase Functions
firebase emulators:start
```

### Production
```bash
# Deploy everything
firebase deploy

# Deploy only functions
firebase deploy --only functions
```

## Monitoring
- Firebase Console for function logs
- Supabase Dashboard for database monitoring  
- Health check endpoint: `/health`
- Automatic failover logging in function logs

## Contact Information
- **Primary**: (813) 219-1920
- **Email**: info@ccnscleaning.com
- **Address**: Tampa Bay Area, Florida
- **Service Area**: Tampa Bay Area, Florida
