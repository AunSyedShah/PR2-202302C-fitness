import express from 'express';
import { body, param, query } from 'express-validator';
import { Progress, User, Goal, ActivityLog } from '../../models/index.js';
import { authenticateToken } from '../../middleware/auth.js';
import { handleValidationErrors, logActivity } from '../../middleware/common.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ======================
// PROGRESS TRACKING ROUTES
// ======================

// Get user's progress entries
router.get('/entries', [
  query('type').optional().isIn(['weight', 'body-measurements', 'performance', 'photo']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { type, startDate, endDate, page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = { user: req.user._id };
    if (type) query.type = type;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const entries = await Progress.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Progress.countDocuments(query);

    res.json({
      entries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch progress entries', details: error.message });
  }
});

// Get single progress entry
router.get('/entries/:id', [
  param('id').isMongoId(),
  handleValidationErrors
], async (req, res) => {
  try {
    const entry = await Progress.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!entry) {
      return res.status(404).json({ error: 'Progress entry not found' });
    }

    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch progress entry', details: error.message });
  }
});

// Create progress entry
router.post('/entries', [
  body('type').isIn(['weight', 'body-measurements', 'performance', 'photo']),
  body('date').isISO8601(),
  body('data').isObject(),
  body('notes').optional().isString().isLength({ max: 500 }),
  handleValidationErrors
], logActivity('progress-logged', 'Logged progress entry'), async (req, res) => {
  try {
    // Validate data based on type
    const { type, data } = req.body;
    
    // Type-specific validation
    switch (type) {
      case 'weight':
        if (!data.weight || typeof data.weight !== 'number' || data.weight <= 0) {
          return res.status(400).json({ error: 'Valid weight is required' });
        }
        break;
      case 'body-measurements':
        const validMeasurements = ['chest', 'waist', 'hips', 'arms', 'thighs', 'neck'];
        const hasValidMeasurement = validMeasurements.some(m => 
          data[m] && typeof data[m] === 'number' && data[m] > 0
        );
        if (!hasValidMeasurement) {
          return res.status(400).json({ 
            error: 'At least one valid body measurement is required',
            validMeasurements 
          });
        }
        break;
      case 'performance':
        if (!data.exercise || !data.value || typeof data.value !== 'number') {
          return res.status(400).json({ 
            error: 'Exercise name and performance value are required' 
          });
        }
        break;
      case 'photo':
        if (!data.photos || !Array.isArray(data.photos) || data.photos.length === 0) {
          return res.status(400).json({ error: 'At least one photo is required' });
        }
        break;
    }

    const entry = new Progress({
      ...req.body,
      user: req.user._id
    });

    await entry.save();
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create progress entry', details: error.message });
  }
});

// Update progress entry
router.put('/entries/:id', [
  param('id').isMongoId(),
  body('data').optional().isObject(),
  body('notes').optional().isString().isLength({ max: 500 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const entry = await Progress.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!entry) {
      return res.status(404).json({ error: 'Progress entry not found' });
    }

    // Update fields
    if (req.body.data) entry.data = { ...entry.data, ...req.body.data };
    if (req.body.notes !== undefined) entry.notes = req.body.notes;

    await entry.save();
    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update progress entry', details: error.message });
  }
});

// Delete progress entry
router.delete('/entries/:id', [
  param('id').isMongoId(),
  handleValidationErrors
], async (req, res) => {
  try {
    const entry = await Progress.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!entry) {
      return res.status(404).json({ error: 'Progress entry not found' });
    }

    res.json({ message: 'Progress entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete progress entry', details: error.message });
  }
});

// ======================
// PROGRESS ANALYTICS ROUTES
// ======================

// Get weight trend analysis
router.get('/analytics/weight', [
  query('period').optional().isIn(['7d', '30d', '90d', '1y']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { period = '30d', startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else {
      const now = new Date();
      const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
      const startOfPeriod = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
      dateFilter = { $gte: startOfPeriod, $lte: now };
    }

    const weightEntries = await Progress.find({
      user: req.user._id,
      type: 'weight',
      date: dateFilter
    }).sort({ date: 1 });

    if (weightEntries.length === 0) {
      return res.json({
        entries: [],
        trend: null,
        statistics: null
      });
    }

    // Calculate trend and statistics
    const weights = weightEntries.map(entry => entry.data.weight);
    const firstWeight = weights[0];
    const lastWeight = weights[weights.length - 1];
    const weightChange = lastWeight - firstWeight;
    const averageWeight = weights.reduce((sum, w) => sum + w, 0) / weights.length;
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);

    // Calculate trend direction
    let trend = 'stable';
    if (weightChange > 0.5) trend = 'increasing';
    else if (weightChange < -0.5) trend = 'decreasing';

    res.json({
      entries: weightEntries,
      trend: {
        direction: trend,
        change: weightChange,
        changePercentage: ((weightChange / firstWeight) * 100).toFixed(2)
      },
      statistics: {
        average: averageWeight.toFixed(2),
        min: minWeight,
        max: maxWeight,
        totalEntries: weightEntries.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch weight analytics', details: error.message });
  }
});

// Get body measurements trend
router.get('/analytics/measurements', [
  query('measurement').optional().isIn(['chest', 'waist', 'hips', 'arms', 'thighs', 'neck']),
  query('period').optional().isIn(['7d', '30d', '90d', '1y']),
  handleValidationErrors
], async (req, res) => {
  try {
    const { measurement, period = '30d' } = req.query;

    const now = new Date();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    const startOfPeriod = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

    const measurementEntries = await Progress.find({
      user: req.user._id,
      type: 'body-measurements',
      date: { $gte: startOfPeriod, $lte: now }
    }).sort({ date: 1 });

    const analytics = {};

    // If specific measurement requested, analyze only that
    if (measurement) {
      const values = measurementEntries
        .map(entry => entry.data[measurement])
        .filter(val => val !== undefined && val !== null);

      if (values.length > 0) {
        const firstValue = values[0];
        const lastValue = values[values.length - 1];
        const change = lastValue - firstValue;

        analytics[measurement] = {
          entries: measurementEntries.map(entry => ({
            date: entry.date,
            value: entry.data[measurement]
          })).filter(e => e.value !== undefined),
          trend: {
            change: change.toFixed(2),
            changePercentage: ((change / firstValue) * 100).toFixed(2)
          },
          statistics: {
            average: (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2),
            min: Math.min(...values),
            max: Math.max(...values)
          }
        };
      }
    } else {
      // Analyze all measurements
      const measurements = ['chest', 'waist', 'hips', 'arms', 'thighs', 'neck'];
      
      measurements.forEach(m => {
        const values = measurementEntries
          .map(entry => entry.data[m])
          .filter(val => val !== undefined && val !== null);

        if (values.length > 0) {
          const firstValue = values[0];
          const lastValue = values[values.length - 1];
          const change = lastValue - firstValue;

          analytics[m] = {
            entries: measurementEntries.map(entry => ({
              date: entry.date,
              value: entry.data[m]
            })).filter(e => e.value !== undefined),
            trend: {
              change: change.toFixed(2),
              changePercentage: ((change / firstValue) * 100).toFixed(2)
            },
            statistics: {
              average: (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2),
              min: Math.min(...values),
              max: Math.max(...values)
            }
          };
        }
      });
    }

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch measurement analytics', details: error.message });
  }
});

// Get performance progress
router.get('/analytics/performance', [
  query('exercise').optional().isString(),
  query('period').optional().isIn(['7d', '30d', '90d', '1y']),
  handleValidationErrors
], async (req, res) => {
  try {
    const { exercise, period = '90d' } = req.query;

    const now = new Date();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    const startOfPeriod = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

    let query = {
      user: req.user._id,
      type: 'performance',
      date: { $gte: startOfPeriod, $lte: now }
    };

    if (exercise) {
      query['data.exercise'] = { $regex: exercise, $options: 'i' };
    }

    const performanceEntries = await Progress.find(query).sort({ date: 1 });

    // Group by exercise
    const exerciseGroups = {};
    performanceEntries.forEach(entry => {
      const exerciseName = entry.data.exercise;
      if (!exerciseGroups[exerciseName]) {
        exerciseGroups[exerciseName] = [];
      }
      exerciseGroups[exerciseName].push({
        date: entry.date,
        value: entry.data.value,
        unit: entry.data.unit || 'reps',
        notes: entry.notes
      });
    });

    // Calculate progress for each exercise
    const analytics = {};
    Object.keys(exerciseGroups).forEach(exerciseName => {
      const entries = exerciseGroups[exerciseName];
      const values = entries.map(e => e.value);
      const firstValue = values[0];
      const lastValue = values[values.length - 1];
      const improvement = lastValue - firstValue;
      const improvementPercentage = ((improvement / firstValue) * 100).toFixed(2);

      analytics[exerciseName] = {
        entries,
        progress: {
          improvement: improvement.toFixed(2),
          improvementPercentage,
          trend: improvement > 0 ? 'improving' : improvement < 0 ? 'declining' : 'stable'
        },
        statistics: {
          best: Math.max(...values),
          average: (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2),
          totalEntries: entries.length
        }
      };
    });

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch performance analytics', details: error.message });
  }
});

// Get progress summary/dashboard
router.get('/summary', async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    // Get recent progress entries
    const recentEntries = await Progress.find({
      user: req.user._id,
      date: { $gte: thirtyDaysAgo }
    }).sort({ date: -1 });

    // Group by type
    const byType = {
      weight: recentEntries.filter(e => e.type === 'weight'),
      measurements: recentEntries.filter(e => e.type === 'body-measurements'),
      performance: recentEntries.filter(e => e.type === 'performance'),
      photos: recentEntries.filter(e => e.type === 'photo')
    };

    // Calculate basic stats
    const summary = {
      totalEntries: recentEntries.length,
      entriesThisMonth: recentEntries.length,
      lastEntry: recentEntries.length > 0 ? recentEntries[0] : null,
      byType: {
        weight: {
          count: byType.weight.length,
          latest: byType.weight[0] || null,
          trend: null
        },
        measurements: {
          count: byType.measurements.length,
          latest: byType.measurements[0] || null
        },
        performance: {
          count: byType.performance.length,
          latest: byType.performance[0] || null,
          uniqueExercises: [...new Set(byType.performance.map(e => e.data.exercise))].length
        },
        photos: {
          count: byType.photos.length,
          latest: byType.photos[0] || null
        }
      }
    };

    // Calculate weight trend if available
    if (byType.weight.length >= 2) {
      const weights = byType.weight.map(e => e.data.weight);
      const firstWeight = weights[weights.length - 1]; // oldest in recent period
      const lastWeight = weights[0]; // newest
      const change = lastWeight - firstWeight;
      
      summary.byType.weight.trend = {
        change: change.toFixed(2),
        direction: change > 0.5 ? 'increasing' : change < -0.5 ? 'decreasing' : 'stable'
      };
    }

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch progress summary', details: error.message });
  }
});

// ======================
// PHOTO PROGRESS ROUTES
// ======================

// Get photo comparison
router.get('/photos/compare', [
  query('startDate').isISO8601(),
  query('endDate').optional().isISO8601(),
  query('category').optional().isIn(['front', 'side', 'back', 'progress']),
  handleValidationErrors
], async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;
    const endDateFilter = endDate ? new Date(endDate) : new Date();

    let query = {
      user: req.user._id,
      type: 'photo',
      date: { $gte: new Date(startDate), $lte: endDateFilter }
    };

    if (category) {
      query['data.category'] = category;
    }

    const photoEntries = await Progress.find(query)
      .sort({ date: 1 })
      .select('date data.photos data.category notes');

    // Group by category and get first/last for comparison
    const comparisons = {};
    
    photoEntries.forEach(entry => {
      const cat = entry.data.category || 'general';
      if (!comparisons[cat]) {
        comparisons[cat] = { first: null, last: null, total: 0 };
      }
      
      if (!comparisons[cat].first) {
        comparisons[cat].first = entry;
      }
      comparisons[cat].last = entry;
      comparisons[cat].total++;
    });

    res.json({
      comparisons,
      totalEntries: photoEntries.length,
      dateRange: {
        start: startDate,
        end: endDate || new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch photo comparison', details: error.message });
  }
});

export default router;
