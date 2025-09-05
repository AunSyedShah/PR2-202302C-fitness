// Database indexes for better query performance
// This file contains all the database indexes that should be applied to the models

import {
  User,
  Exercise,
  WorkoutRoutine,
  WorkoutSession,
  Food,
  NutritionEntry,
  Progress,
  Goal,
  Notification,
  SupportTicket,
  ForumPost,
  Report,
  Reminder,
  ActivityLog,
  MealPlan,
  WorkoutTemplate
} from './index.js';

export const createIndexes = async () => {
  try {
    console.log('Creating database indexes...');

    // User indexes
    await User.createIndexes([
      { username: 1 },
      { email: 1 },
      { 'name.firstName': 1, 'name.lastName': 1 }
    ]);

    // Exercise indexes
    await Exercise.createIndexes([
      { name: 1, category: 1 },
      { muscleGroups: 1 },
      { equipment: 1 }
    ]);

    // WorkoutRoutine indexes
    await WorkoutRoutine.createIndexes([
      { user: 1, createdAt: -1 },
      { category: 1, difficulty: 1 },
      { tags: 1 }
    ]);

    // WorkoutSession indexes
    await WorkoutSession.createIndexes([
      { user: 1, startTime: -1 },
      { routine: 1 }
    ]);

    // Food indexes
    await Food.createIndexes([
      { name: 1, brand: 1 },
      { barcode: 1 },
      { category: 1 }
    ]);

    // NutritionEntry indexes
    await NutritionEntry.createIndexes([
      { user: 1, date: -1 }
    ]);

    // Progress indexes
    await Progress.createIndexes([
      { user: 1, date: -1, type: 1 }
    ]);

    // Goal indexes
    await Goal.createIndexes([
      { user: 1, status: 1 },
      { targetDate: 1 }
    ]);

    // Notification indexes
    await Notification.createIndexes([
      { user: 1, isRead: 1, createdAt: -1 },
      { scheduledFor: 1 }
    ]);

    // SupportTicket indexes
    await SupportTicket.createIndexes([
      { user: 1, status: 1 },
      { category: 1, priority: 1 }
    ]);

    // ForumPost indexes
    await ForumPost.createIndexes([
      { category: 1, createdAt: -1 },
      { author: 1 },
      { tags: 1 }
    ]);

    // MealPlan indexes
    await MealPlan.createIndexes([
      { user: 1, createdAt: -1 },
      { isPublic: 1, tags: 1 }
    ]);

    // WorkoutTemplate indexes
    await WorkoutTemplate.createIndexes([
      { category: 1, difficulty: 1, averageRating: -1 },
      { creator: 1 },
      { tags: 1, equipment: 1 }
    ]);

    // Report indexes
    await Report.createIndexes([
      { user: 1, createdAt: -1 }
    ]);

    // Reminder indexes
    await Reminder.createIndexes([
      { user: 1, 'schedule.frequency': 1 }
    ]);

    // ActivityLog indexes
    await ActivityLog.createIndexes([
      { user: 1, createdAt: -1 },
      { action: 1 }
    ]);

    console.log('✅ All database indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  }
};

export default createIndexes;
