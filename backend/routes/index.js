import express from 'express';

// Import route modules
import authRoutes from './auth/auth.js';
import nutritionRoutes from './nutrition/nutrition.js';
import socialRoutes from './social/social.js';
import progressRoutes from './progress/progress.js';
import goalRoutes from './goals/goals.js';
import dashboardRoutes from './dashboard/dashboard.js';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    routes: {
      auth: '/api/v1/auth',
      nutrition: '/api/v1/nutrition',
      social: '/api/v1/social',
      progress: '/api/v1/progress',
      goals: '/api/v1/goals',
      dashboard: '/api/v1/dashboard'
    }
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/nutrition', nutritionRoutes);
router.use('/social', socialRoutes);
router.use('/progress', progressRoutes);
router.use('/goals', goalRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
