const express = require('express');
const rateLimit = require('express-rate-limit');
const AnalyticsController = require('../controllers/analyticsController');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

// Rate limiter requirement: Analytics API: 50 requests per hour
const analyticsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Analytics request limit reached (50 requests per hour). Please try again later.',
  },
});

router.use(authenticate);
router.use(analyticsLimiter);

router.get('/overview', AnalyticsController.getOverview);
router.get('/monthly', AnalyticsController.getMonthly);
router.get('/categories', AnalyticsController.getCategories);
router.get('/trends', AnalyticsController.getTrends);
router.get('/insights', AnalyticsController.getInsights);

module.exports = router;
