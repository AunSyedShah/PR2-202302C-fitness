import express from 'express';
import { query } from 'express-validator';
import { 
  User, 
  WorkoutSession, 
  NutritionEntry, 
  Progress, 
  Goal, 
  ActivityLog, 
  ForumPost,
  WorkoutTemplate 
} from '../../models/index.js';
import { authenticateToken } from '../../middleware/auth.js';
import { handleValidationErrors } from '../../middleware/common.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ======================
// MAIN DASHBOARD ROUTE
// ======================

// Get comprehensive dashboard data
router.get('/', async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

    // Get dashboard data in parallel
    const [
      recentWorkouts,
      weeklyNutrition,
      activeGoals,
      recentProgress,
      weeklyStats,
      achievements,
      upcomingReminders
    ] = await Promise.all([
      // Recent workouts (last 7 days)
      WorkoutSession.find({
        user: userId,
        date: { $gte: sevenDaysAgo }
      })
      .populate('routine', 'name category')
      .sort({ date: -1 })
      .limit(5),

      // Weekly nutrition summary
      NutritionEntry.aggregate([
        {
          $match: {
            user: userId,
            date: { $gte: sevenDaysAgo }
          }
        },
        {
          $group: {
            _id: null,
            totalCalories: { $sum: '$totalCalories' },
            avgCalories: { $avg: '$totalCalories' },
            totalProtein: { $sum: '$totalProtein' },
            totalCarbs: { $sum: '$totalCarbs' },
            totalFat: { $sum: '$totalFat' },
            entries: { $sum: 1 }
          }
        }
      ]),

      // Active goals with progress
      Goal.find({
        user: userId,
        status: 'active'
      }).sort({ priority: -1, createdAt: -1 }).limit(5),

      // Recent progress entries
      Progress.find({
        user: userId,
        date: { $gte: sevenDaysAgo }
      }).sort({ date: -1 }).limit(10),

      // Weekly activity stats
      getWeeklyActivityStats(userId, sevenDaysAgo),

      // Recent achievements (completed goals, milestones)
      getRecentAchievements(userId, thirtyDaysAgo),

      // Upcoming reminders/notifications
      getUpcomingReminders(userId)
    ]);

    // Calculate goal progress percentages
    const goalsWithProgress = await Promise.all(
      activeGoals.map(async (goal) => {
        const progressPercentage = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
        return {
          ...goal.toObject(),
          progressPercentage: Math.round(progressPercentage)
        };
      })
    );

    // Build dashboard response
    const dashboard = {
      user: {
        name: req.user.name,
        profilePicture: req.user.profilePicture,
        joinDate: req.user.createdAt
      },
      summary: {
        workoutsThisWeek: recentWorkouts.length,
        averageDailyCalories: weeklyNutrition[0]?.avgCalories || 0,
        activeGoals: activeGoals.length,
        progressEntries: recentProgress.length
      },
      recentActivity: {
        workouts: recentWorkouts,
        nutrition: weeklyNutrition[0] || null,
        progress: recentProgress
      },
      goals: goalsWithProgress,
      stats: weeklyStats,
      achievements: achievements,
      reminders: upcomingReminders,
      insights: await generateInsights(userId, {
        workouts: recentWorkouts,
        nutrition: weeklyNutrition[0],
        goals: goalsWithProgress,
        progress: recentProgress
      })
    };

    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data', details: error.message });
  }
});

// ======================
// WORKOUT ANALYTICS
// ======================

// Get workout analytics
router.get('/workouts', [
  query('period').optional().isIn(['7d', '30d', '90d', '1y']),
  handleValidationErrors
], async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const userId = req.user._id;
    
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

    const [workoutStats, categoryStats, frequencyStats, volumeStats] = await Promise.all([
      // Overall workout statistics
      WorkoutSession.aggregate([
        { $match: { user: userId, date: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            totalWorkouts: { $sum: 1 },
            totalDuration: { $sum: '$duration' },
            avgDuration: { $avg: '$duration' },
            totalCaloriesBurned: { $sum: '$caloriesBurned' },
            avgCaloriesBurned: { $avg: '$caloriesBurned' }
          }
        }
      ]),

      // Workouts by category
      WorkoutSession.aggregate([
        { $match: { user: userId, date: { $gte: startDate } } },
        { $lookup: { from: 'workoutroutines', localField: 'routine', foreignField: '_id', as: 'routineInfo' } },
        { $unwind: '$routineInfo' },
        {
          $group: {
            _id: '$routineInfo.category',
            count: { $sum: 1 },
            totalDuration: { $sum: '$duration' },
            avgDuration: { $avg: '$duration' }
          }
        }
      ]),

      // Workout frequency by day of week
      WorkoutSession.aggregate([
        { $match: { user: userId, date: { $gte: startDate } } },
        {
          $group: {
            _id: { $dayOfWeek: '$date' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]),

      // Volume progression over time
      WorkoutSession.aggregate([
        { $match: { user: userId, date: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' },
              week: { $week: '$date' }
            },
            totalVolume: { $sum: '$totalVolume' },
            workoutCount: { $sum: 1 },
            avgDuration: { $avg: '$duration' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1 } }
      ])
    ]);

    res.json({
      period,
      overview: workoutStats[0] || {},
      byCategory: categoryStats,
      frequency: frequencyStats,
      volumeProgression: volumeStats
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workout analytics', details: error.message });
  }
});

// ======================
// NUTRITION ANALYTICS
// ======================

// Get nutrition analytics
router.get('/nutrition', [
  query('period').optional().isIn(['7d', '30d', '90d']),
  handleValidationErrors
], async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const userId = req.user._id;
    
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

    const [nutritionStats, dailyTrends, macroDistribution, calorieGoalsComparison] = await Promise.all([
      // Overall nutrition statistics
      NutritionEntry.aggregate([
        { $match: { user: userId, date: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            totalEntries: { $sum: 1 },
            avgCalories: { $avg: '$totalCalories' },
            avgProtein: { $avg: '$totalProtein' },
            avgCarbs: { $avg: '$totalCarbs' },
            avgFat: { $avg: '$totalFat' },
            maxCalories: { $max: '$totalCalories' },
            minCalories: { $min: '$totalCalories' }
          }
        }
      ]),

      // Daily nutrition trends
      NutritionEntry.aggregate([
        { $match: { user: userId, date: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' },
              day: { $dayOfMonth: '$date' }
            },
            calories: { $sum: '$totalCalories' },
            protein: { $sum: '$totalProtein' },
            carbs: { $sum: '$totalCarbs' },
            fat: { $sum: '$totalFat' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]),

      // Macro distribution
      NutritionEntry.aggregate([
        { $match: { user: userId, date: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            totalProtein: { $sum: '$totalProtein' },
            totalCarbs: { $sum: '$totalCarbs' },
            totalFat: { $sum: '$totalFat' }
          }
        }
      ]),

      // Compare with goals (if user has nutrition goals)
      Goal.find({
        user: userId,
        category: { $in: ['weight-loss', 'weight-gain', 'general-fitness'] },
        status: 'active'
      })
    ]);

    res.json({
      period,
      overview: nutritionStats[0] || {},
      dailyTrends,
      macroDistribution: macroDistribution[0] || {},
      goals: calorieGoalsComparison
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch nutrition analytics', details: error.message });
  }
});

// ======================
// SOCIAL ANALYTICS
// ======================

// Get social analytics
router.get('/social', async (req, res) => {
  try {
    const userId = req.user._id;
    const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));

    const [userStats, socialActivity, forumEngagement] = await Promise.all([
      // User's social statistics
      User.findById(userId).select('followers following'),

      // Recent social activity
      ActivityLog.find({
        user: userId,
        action: { $in: ['follow-user', 'post-created', 'post-liked', 'template-downloaded'] },
        createdAt: { $gte: thirtyDaysAgo }
      }).sort({ createdAt: -1 }).limit(20),

      // Forum engagement
      ForumPost.aggregate([
        { $match: { author: userId, createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: null,
            totalPosts: { $sum: 1 },
            totalLikes: { $sum: { $size: '$likes' } },
            totalReplies: { $sum: { $size: '$replies' } },
            totalViews: { $sum: '$views' }
          }
        }
      ])
    ]);

    res.json({
      followers: userStats.followers.length,
      following: userStats.following.length,
      recentActivity: socialActivity,
      forumStats: forumEngagement[0] || {
        totalPosts: 0,
        totalLikes: 0,
        totalReplies: 0,
        totalViews: 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch social analytics', details: error.message });
  }
});

// ======================
// HELPER FUNCTIONS
// ======================

async function getWeeklyActivityStats(userId, startDate) {
  const stats = await ActivityLog.aggregate([
    { $match: { user: userId, createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 }
      }
    }
  ]);

  return stats.reduce((acc, stat) => {
    acc[stat._id] = stat.count;
    return acc;
  }, {});
}

async function getRecentAchievements(userId, startDate) {
  const [completedGoals, completedMilestones] = await Promise.all([
    Goal.find({
      user: userId,
      status: 'completed',
      completedAt: { $gte: startDate }
    }).select('title completedAt category'),

    Goal.aggregate([
      { $match: { user: userId } },
      { $unwind: '$milestones' },
      {
        $match: {
          'milestones.isCompleted': true,
          'milestones.completedAt': { $gte: startDate }
        }
      },
      {
        $project: {
          goalTitle: '$title',
          milestoneTitle: '$milestones.title',
          completedAt: '$milestones.completedAt'
        }
      }
    ])
  ]);

  return {
    goals: completedGoals,
    milestones: completedMilestones
  };
}

async function getUpcomingReminders(userId) {
  // This would typically fetch from a reminders/notifications table
  // For now, we'll return upcoming goal deadlines
  const now = new Date();
  const nextWeek = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

  const upcomingGoals = await Goal.find({
    user: userId,
    status: 'active',
    targetDate: { $gte: now, $lte: nextWeek }
  }).select('title targetDate priority').sort({ targetDate: 1 });

  return upcomingGoals.map(goal => ({
    type: 'goal_deadline',
    title: `Goal deadline approaching: ${goal.title}`,
    date: goal.targetDate,
    priority: goal.priority
  }));
}

async function generateInsights(userId, data) {
  const insights = [];

  // Workout insights
  if (data.workouts.length === 0) {
    insights.push({
      type: 'workout',
      level: 'warning',
      message: 'No workouts this week. Consider scheduling some exercise time!'
    });
  } else if (data.workouts.length >= 3) {
    insights.push({
      type: 'workout',
      level: 'success',
      message: `Great job! You've completed ${data.workouts.length} workouts this week.`
    });
  }

  // Nutrition insights
  if (data.nutrition && data.nutrition.avgCalories) {
    if (data.nutrition.avgCalories < 1200) {
      insights.push({
        type: 'nutrition',
        level: 'warning',
        message: 'Your daily calorie intake seems low. Consider consulting a nutritionist.'
      });
    } else if (data.nutrition.avgCalories > 3000) {
      insights.push({
        type: 'nutrition',
        level: 'info',
        message: 'High calorie intake detected. Make sure this aligns with your goals.'
      });
    }
  }

  // Goal insights
  const overDueGoals = data.goals.filter(goal => new Date(goal.targetDate) < new Date());
  if (overDueGoals.length > 0) {
    insights.push({
      type: 'goals',
      level: 'warning',
      message: `You have ${overDueGoals.length} overdue goal(s). Consider updating your targets.`
    });
  }

  const nearCompletionGoals = data.goals.filter(goal => goal.progressPercentage >= 80);
  if (nearCompletionGoals.length > 0) {
    insights.push({
      type: 'goals',
      level: 'success',
      message: `${nearCompletionGoals.length} goal(s) are almost complete! Keep pushing!`
    });
  }

  return insights;
}

export default router;
