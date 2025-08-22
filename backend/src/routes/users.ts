import express from 'express';
import { protect } from '../middleware/auth';

const router = express.Router();

// All user routes require authentication
router.use(protect);

// GET /api/users/dashboard - Get user dashboard data
router.get('/dashboard', (req, res) => {
  res.json({
    status: 'success',
    message: 'User dashboard endpoint - coming soon',
    data: {
      upcomingAppointments: [],
      recentPayments: [],
      accountStats: {
        totalAppointments: 0,
        totalSpent: 0
      }
    }
  });
});

export default router;
