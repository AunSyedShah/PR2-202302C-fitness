import express from 'express';
import { body, param, query } from 'express-validator';
import { Goal, User, Progress, Notification, ActivityLog } from '../../models/index.js';
import { authenticateToken } from '../../middleware/auth.js';
import { handleValidationErrors, logActivity } from '../../middleware/common.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ======================
// GOAL MANAGEMENT ROUTES
// ======================

// Get user's goals
router.get('/', [
  query('status').optional().isIn(['active', 'completed', 'paused', 'cancelled']),
  query('category').optional().isIn(['weight-loss', 'weight-gain', 'muscle-gain', 'strength', 'endurance', 'flexibility', 'general-fitness']),
  query('priority').optional().isIn(['low', 'medium', 'high']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { status, category, priority, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = { user: req.user._id };
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;

    const goals = await Goal.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Goal.countDocuments(query);

    // Calculate progress for each goal
    const goalsWithProgress = await Promise.all(goals.map(async (goal) => {
      const progressPercentage = await calculateGoalProgress(goal);
      return {
        ...goal.toObject(),
        progressPercentage
      };
    }));

    res.json({
      goals: goalsWithProgress,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch goals', details: error.message });
  }
});

// Get single goal
router.get('/:id', [
  param('id').isMongoId(),
  handleValidationErrors
], async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    // Calculate progress
    const progressPercentage = await calculateGoalProgress(goal);
    
    // Get recent progress entries related to this goal
    const recentProgress = await getRecentProgressForGoal(goal);

    res.json({
      ...goal.toObject(),
      progressPercentage,
      recentProgress
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch goal', details: error.message });
  }
});

// Create new goal
router.post('/', [
  body('title').isString().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().isString().isLength({ max: 1000 }),
  body('category').isIn(['weight-loss', 'weight-gain', 'muscle-gain', 'strength', 'endurance', 'flexibility', 'general-fitness']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('targetValue').isNumeric(),
  body('currentValue').optional().isNumeric(),
  body('unit').isString().trim(),
  body('targetDate').isISO8601(),
  body('milestones').optional().isArray(),
  body('reminderFrequency').optional().isIn(['daily', 'weekly', 'monthly']),
  body('isPublic').optional().isBoolean(),
  handleValidationErrors
], logActivity('goal-created', 'Created a new goal'), async (req, res) => {
  try {
    // Validate milestone structure if provided
    if (req.body.milestones) {
      for (const milestone of req.body.milestones) {
        if (!milestone.title || !milestone.targetValue || !milestone.targetDate) {
          return res.status(400).json({ 
            error: 'Each milestone must have title, targetValue, and targetDate' 
          });
        }
      }
    }

    const goal = new Goal({
      ...req.body,
      user: req.user._id,
      currentValue: req.body.currentValue || 0
    });

    await goal.save();

    // Create reminder if frequency is set
    if (req.body.reminderFrequency) {
      await createGoalReminder(goal);
    }

    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create goal', details: error.message });
  }
});

// Update goal
router.put('/:id', [
  param('id').isMongoId(),
  body('title').optional().isString().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().isString().isLength({ max: 1000 }),
  body('category').optional().isIn(['weight-loss', 'weight-gain', 'muscle-gain', 'strength', 'endurance', 'flexibility', 'general-fitness']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('targetValue').optional().isNumeric(),
  body('currentValue').optional().isNumeric(),
  body('unit').optional().isString().trim(),
  body('targetDate').optional().isISO8601(),
  body('status').optional().isIn(['active', 'completed', 'paused', 'cancelled']),
  body('milestones').optional().isArray(),
  body('reminderFrequency').optional().isIn(['daily', 'weekly', 'monthly', 'none']),
  body('isPublic').optional().isBoolean(),
  handleValidationErrors
], async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        goal[key] = req.body[key];
      }
    });

    await goal.save();

    // Check if goal is completed
    if (req.body.status === 'completed' && goal.status !== 'completed') {
      await handleGoalCompletion(goal);
    }

    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update goal', details: error.message });
  }
});

// Delete goal
router.delete('/:id', [
  param('id').isMongoId(),
  handleValidationErrors
], async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete goal', details: error.message });
  }
});

// Update goal progress
router.post('/:id/progress', [
  param('id').isMongoId(),
  body('value').isNumeric(),
  body('notes').optional().isString().isLength({ max: 500 }),
  body('date').optional().isISO8601(),
  handleValidationErrors
], logActivity('goal-progress-updated', 'Updated goal progress'), async (req, res) => {
  try {
    const { value, notes, date } = req.body;
    
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    if (goal.status !== 'active') {
      return res.status(400).json({ error: 'Cannot update progress on inactive goal' });
    }

    // Update current value
    const previousValue = goal.currentValue;
    goal.currentValue = value;

    // Add progress entry
    const progressEntry = {
      date: date ? new Date(date) : new Date(),
      value,
      notes: notes || '',
      previousValue
    };
    goal.progressHistory.push(progressEntry);

    // Check milestone completion
    const completedMilestones = checkMilestoneCompletion(goal, previousValue, value);
    
    // Check if goal is completed
    const isCompleted = checkGoalCompletion(goal);
    if (isCompleted && goal.status === 'active') {
      goal.status = 'completed';
      goal.completedAt = new Date();
      await handleGoalCompletion(goal);
    }

    await goal.save();

    // Send notifications for completed milestones
    for (const milestone of completedMilestones) {
      await createMilestoneNotification(goal, milestone);
    }

    const progressPercentage = await calculateGoalProgress(goal);

    res.json({
      message: 'Progress updated successfully',
      goal: goal.toObject(),
      progressPercentage,
      completedMilestones,
      isGoalCompleted: isCompleted
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update progress', details: error.message });
  }
});

// ======================
// MILESTONE ROUTES
// ======================

// Complete milestone manually
router.post('/:id/milestones/:milestoneId/complete', [
  param('id').isMongoId(),
  param('milestoneId').isMongoId(),
  body('notes').optional().isString().isLength({ max: 500 }),
  handleValidationErrors
], logActivity('milestone-completed', 'Completed milestone'), async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const milestone = goal.milestones.id(req.params.milestoneId);
    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    if (milestone.isCompleted) {
      return res.status(400).json({ error: 'Milestone already completed' });
    }

    // Mark milestone as completed
    milestone.isCompleted = true;
    milestone.completedAt = new Date();
    if (req.body.notes) {
      milestone.notes = req.body.notes;
    }

    await goal.save();
    await createMilestoneNotification(goal, milestone);

    res.json({
      message: 'Milestone completed successfully',
      milestone,
      goal: goal.toObject()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete milestone', details: error.message });
  }
});

// ======================
// GOAL ANALYTICS ROUTES
// ======================

// Get goal statistics
router.get('/analytics/stats', async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await Goal.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          paused: { $sum: { $cond: [{ $eq: ['$status', 'paused'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
        }
      }
    ]);

    const categoryStats = await Goal.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
        }
      }
    ]);

    // Get completion rate over time (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const completionTrend = await Goal.aggregate([
      {
        $match: {
          user: userId,
          completedAt: { $gte: sixMonthsAgo },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$completedAt' },
            month: { $month: '$completedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      overall: stats[0] || { total: 0, active: 0, completed: 0, paused: 0, cancelled: 0 },
      byCategory: categoryStats,
      completionTrend,
      completionRate: stats[0] ? ((stats[0].completed / stats[0].total) * 100).toFixed(2) : 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch goal analytics', details: error.message });
  }
});

// Get progress insights
router.get('/analytics/insights', async (req, res) => {
  try {
    const activeGoals = await Goal.find({
      user: req.user._id,
      status: 'active'
    });

    const insights = [];

    for (const goal of activeGoals) {
      const progressPercentage = await calculateGoalProgress(goal);
      const daysRemaining = Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24));
      
      let insight = {
        goalId: goal._id,
        goalTitle: goal.title,
        progressPercentage,
        daysRemaining,
        category: goal.category,
        priority: goal.priority
      };

      // Generate insights based on progress and timeline
      if (daysRemaining < 0) {
        insight.type = 'overdue';
        insight.message = `Goal is ${Math.abs(daysRemaining)} days overdue`;
        insight.severity = 'high';
      } else if (daysRemaining <= 7 && progressPercentage < 80) {
        insight.type = 'at_risk';
        insight.message = `Only ${daysRemaining} days left with ${progressPercentage.toFixed(1)}% progress`;
        insight.severity = 'medium';
      } else if (progressPercentage >= 100) {
        insight.type = 'ready_to_complete';
        insight.message = 'Goal target reached! Mark as completed.';
        insight.severity = 'low';
      } else if (progressPercentage > 80) {
        insight.type = 'on_track';
        insight.message = `Great progress! ${progressPercentage.toFixed(1)}% complete`;
        insight.severity = 'low';
      } else if (progressPercentage < 25 && daysRemaining <= 30) {
        insight.type = 'behind';
        insight.message = `Progress is behind schedule (${progressPercentage.toFixed(1)}%)`;
        insight.severity = 'medium';
      }

      if (insight.type) {
        insights.push(insight);
      }
    }

    // Sort by severity and progress
    insights.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });

    res.json(insights);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch goal insights', details: error.message });
  }
});

// ======================
// HELPER FUNCTIONS
// ======================

async function calculateGoalProgress(goal) {
  if (goal.targetValue === 0) return 0;
  return Math.min((goal.currentValue / goal.targetValue) * 100, 100);
}

async function getRecentProgressForGoal(goal) {
  // Get last 10 progress entries
  return goal.progressHistory
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);
}

function checkMilestoneCompletion(goal, previousValue, newValue) {
  const completedMilestones = [];
  
  goal.milestones.forEach(milestone => {
    if (!milestone.isCompleted && 
        previousValue < milestone.targetValue && 
        newValue >= milestone.targetValue) {
      milestone.isCompleted = true;
      milestone.completedAt = new Date();
      completedMilestones.push(milestone);
    }
  });

  return completedMilestones;
}

function checkGoalCompletion(goal) {
  return goal.currentValue >= goal.targetValue;
}

async function handleGoalCompletion(goal) {
  // This would typically:
  // 1. Create a notification
  // 2. Award achievements/badges
  // 3. Log activity
  // 4. Send congratulatory message
  
  const notification = new Notification({
    user: goal.user,
    title: 'Goal Completed! 🎉',
    message: `Congratulations! You've completed your goal: ${goal.title}`,
    type: 'achievement',
    relatedEntity: {
      type: 'Goal',
      id: goal._id
    }
  });

  await notification.save();
}

async function createMilestoneNotification(goal, milestone) {
  const notification = new Notification({
    user: goal.user,
    title: 'Milestone Achieved! 🌟',
    message: `You've reached a milestone: ${milestone.title} for goal "${goal.title}"`,
    type: 'milestone',
    relatedEntity: {
      type: 'Goal',
      id: goal._id
    }
  });

  await notification.save();
}

async function createGoalReminder(goal) {
  // This would integrate with a job scheduler (like node-cron) 
  // to create recurring reminders based on the frequency
  // For now, we'll just create an initial reminder notification
  
  const reminderDate = new Date();
  switch (goal.reminderFrequency) {
    case 'daily':
      reminderDate.setDate(reminderDate.getDate() + 1);
      break;
    case 'weekly':
      reminderDate.setDate(reminderDate.getDate() + 7);
      break;
    case 'monthly':
      reminderDate.setMonth(reminderDate.getMonth() + 1);
      break;
  }

  // This would be handled by a background job scheduler in production
  console.log(`Reminder scheduled for goal "${goal.title}" on ${reminderDate}`);
}

export default router;
