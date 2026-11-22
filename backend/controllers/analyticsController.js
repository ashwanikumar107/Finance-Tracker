const AnalyticsService = require('../services/analyticsService');
const InsightService = require('../services/insightService');
const CacheService = require('../services/cacheService');

// Redis cache TTL requirement: 15 minutes = 900 seconds
const ANALYTICS_CACHE_TTL = 900;

class AnalyticsController {
  /**
   * Financial Overview with balance, totals, savings rate, and financial health
   * GET /api/analytics/overview
   */
  static async getOverview(req, res, next) {
    try {
      const userId = req.user.id;
      const { start_date = '', end_date = '' } = req.query;

      const cacheKey = `analytics:user:${userId}:overview:${start_date}:${end_date}`;
      const cached = await CacheService.get(cacheKey);

      if (cached) {
        return res.status(200).json({
          success: true,
          source: 'cache',
          data: cached,
        });
      }

      const overview = await AnalyticsService.getOverview(userId, start_date, end_date);
      await CacheService.set(cacheKey, overview, ANALYTICS_CACHE_TTL);

      return res.status(200).json({
        success: true,
        source: 'database',
        data: overview,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Monthly Income vs Expenses (Bar chart data)
   * GET /api/analytics/monthly
   */
  static async getMonthly(req, res, next) {
    try {
      const userId = req.user.id;
      const months = parseInt(req.query.months, 10) || 6;

      const cacheKey = `analytics:user:${userId}:monthly:${months}`;
      const cached = await CacheService.get(cacheKey);

      if (cached) {
        return res.status(200).json({
          success: true,
          source: 'cache',
          data: cached,
        });
      }

      const data = await AnalyticsService.getMonthlyData(userId, months);
      await CacheService.set(cacheKey, data, ANALYTICS_CACHE_TTL);

      return res.status(200).json({
        success: true,
        source: 'database',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Category Breakdown (Doughnut / Pie chart data)
   * GET /api/analytics/categories
   */
  static async getCategories(req, res, next) {
    try {
      const userId = req.user.id;
      const { type = 'expense', start_date = '', end_date = '' } = req.query;

      const cacheKey = `analytics:user:${userId}:categories:${type}:${start_date}:${end_date}`;
      const cached = await CacheService.get(cacheKey);

      if (cached) {
        return res.status(200).json({
          success: true,
          source: 'cache',
          data: cached,
        });
      }

      const data = await AnalyticsService.getCategoryBreakdown(userId, type, start_date, end_date);
      await CacheService.set(cacheKey, data, ANALYTICS_CACHE_TTL);

      return res.status(200).json({
        success: true,
        source: 'database',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Spending Trends and Yearly Overview (Line chart data)
   * GET /api/analytics/trends
   */
  static async getTrends(req, res, next) {
    try {
      const userId = req.user.id;
      const year = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();

      const cacheKey = `analytics:user:${userId}:trends:${year}`;
      const cached = await CacheService.get(cacheKey);

      if (cached) {
        return res.status(200).json({
          success: true,
          source: 'cache',
          data: cached,
        });
      }

      const data = await AnalyticsService.getYearlyOverview(userId, year);
      await CacheService.set(cacheKey, data, ANALYTICS_CACHE_TTL);

      return res.status(200).json({
        success: true,
        source: 'database',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Rule-Based Smart Spending Insights
   * GET /api/analytics/insights
   */
  static async getInsights(req, res, next) {
    try {
      const userId = req.user.id;

      const cacheKey = `insights:user:${userId}`;
      const cached = await CacheService.get(cacheKey);

      if (cached) {
        return res.status(200).json({
          success: true,
          source: 'cache',
          data: cached,
        });
      }

      const insights = await InsightService.generateInsights(userId);
      await CacheService.set(cacheKey, insights, ANALYTICS_CACHE_TTL);

      return res.status(200).json({
        success: true,
        source: 'database',
        data: insights,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AnalyticsController;
