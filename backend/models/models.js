/**
 * Fitness App Models
 * 
 * This file maintains backward compatibility while the models have been
 * refactored into separate modules for better organization and maintainability.
 * 
 * The original monolithic models.js has been moved to models.original.js
 * and the models are now organized in the /schemas directory.
 */

// Import all models from the modular structure
export {
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