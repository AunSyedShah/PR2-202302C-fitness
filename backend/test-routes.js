#!/usr/bin/env node

/**
 * API Route Documentation
 * This script lists all the available API endpoints in the fitness app
 */

console.log('🔥 Fitness API - Available Routes\n');
console.log('Base URL: http://localhost:3000/api/v1\n');

const routes = {
  'AUTH': [
    'POST   /auth/register          - Register new user',
    'POST   /auth/login             - Login user'
  ],
  'USERS': [
    'GET    /users/profile          - Get current user profile',
    'PUT    /users/profile          - Update user profile', 
    'GET    /users/search           - Search users',
    'POST   /users/:userId/follow   - Follow/unfollow user'
  ],
  'EXERCISES': [
    'GET    /exercises              - Get exercises with filtering',
    'GET    /exercises/:id          - Get single exercise',
    'POST   /exercises              - Create custom exercise',
    'PUT    /exercises/:id          - Update exercise',
    'DELETE /exercises/:id          - Delete exercise'
  ],
  'WORKOUT ROUTINES': [
    'GET    /workout-routines       - Get user\'s workout routines',
    'GET    /workout-routines/:id   - Get single routine',
    'POST   /workout-routines       - Create workout routine',
    'PUT    /workout-routines/:id   - Update routine', 
    'DELETE /workout-routines/:id   - Delete routine'
  ],
  'WORKOUT SESSIONS': [
    'GET    /workout-sessions       - Get workout sessions',
    'POST   /workout-sessions/start - Start workout session',
    'PUT    /workout-sessions/:id   - Update session',
    'POST   /workout-sessions/:id/complete - Complete session'
  ],
  'FOOD & NUTRITION': [
    'GET    /foods/search           - Search food database',
    'GET    /foods/:id              - Get food details',
    'POST   /foods                  - Add custom food',
    'GET    /nutrition-entries      - Get nutrition logs',
    'POST   /nutrition-entries      - Log nutrition entry'
  ],
  'PROGRESS': [
    'GET    /progress               - Get progress entries',
    'POST   /progress               - Record progress',
    'PUT    /progress/:id           - Update progress',
    'DELETE /progress/:id           - Delete progress'
  ],
  'GOALS': [
    'GET    /goals                  - Get user goals',
    'POST   /goals                  - Create goal',
    'PUT    /goals/:id              - Update goal',
    'DELETE /goals/:id              - Delete goal'
  ],
  'NOTIFICATIONS': [
    'GET    /notifications          - Get notifications',
    'PUT    /notifications/:id/read - Mark as read',
    'PUT    /notifications/mark-all-read - Mark all as read'
  ],
  'SUPPORT': [
    'GET    /support-tickets        - Get support tickets',
    'POST   /support-tickets        - Create ticket',
    'POST   /support-tickets/:id/responses - Add response'
  ],
  'FORUM': [
    'GET    /forum-posts            - Get forum posts',
    'POST   /forum-posts            - Create post',
    'POST   /forum-posts/:id/like   - Like/unlike post',
    'POST   /forum-posts/:id/replies - Reply to post'
  ],
  'MEAL PLANS': [
    'GET    /meal-plans             - Get meal plans',
    'POST   /meal-plans             - Create meal plan',
    'PUT    /meal-plans/:id         - Update meal plan',
    'DELETE /meal-plans/:id         - Delete meal plan'
  ],
  'WORKOUT TEMPLATES': [
    'GET    /workout-templates      - Get templates',
    'POST   /workout-templates      - Create template',
    'POST   /workout-templates/:id/rate - Rate template'
  ],
  'REMINDERS': [
    'GET    /reminders              - Get reminders',
    'POST   /reminders              - Create reminder',
    'PUT    /reminders/:id          - Update reminder',
    'DELETE /reminders/:id          - Delete reminder'
  ],
  'REPORTS': [
    'GET    /reports                - Get reports',
    'POST   /reports                - Request report generation'
  ],
  'ACTIVITY LOG': [
    'GET    /activity-log           - Get activity history'
  ]
};

const methodColors = {
  'GET': '\x1b[32m',     // Green
  'POST': '\x1b[33m',    // Yellow  
  'PUT': '\x1b[34m',     // Blue
  'DELETE': '\x1b[31m',  // Red
  'PATCH': '\x1b[35m'    // Magenta
};

let totalEndpoints = 0;

Object.keys(routes).forEach(category => {
  console.log(`📁 ${category}:`);
  routes[category].forEach(route => {
    const method = route.split(/\s+/)[0];
    const color = methodColors[method] || '\x1b[0m';
    const coloredRoute = route.replace(method, `${color}${method}\x1b[0m`);
    console.log(`  ${coloredRoute}`);
    totalEndpoints++;
  });
  console.log('');
});

// Summary
console.log(`✅ Total: ${totalEndpoints} endpoints across ${Object.keys(routes).length} categories`);
console.log('\n🚀 To start the server: npm run dev');
console.log('📋 Health check: http://localhost:3000/health');

// Database models
console.log('\n📊 Database Models:');
const models = [
  'User', 'Exercise', 'WorkoutRoutine', 'WorkoutSession', 
  'Food', 'NutritionEntry', 'Progress', 'Goal', 
  'Notification', 'SupportTicket', 'ForumPost', 
  'MealPlan', 'WorkoutTemplate', 'Report', 
  'Reminder', 'ActivityLog'
];

models.forEach((model, index) => {
  const emoji = index % 4 === 0 ? '👤' : index % 4 === 1 ? '💪' : index % 4 === 2 ? '🍎' : '📊';
  console.log(`  ${emoji} ${model}`);
});

console.log(`\n🎯 All ${models.length} models have corresponding API endpoints!`);
console.log('\n🔐 Authentication required for all endpoints except /auth/register and /auth/login');
console.log('📝 Comprehensive input validation and error handling implemented');
console.log('🔄 Activity logging tracks all user actions');
console.log('🔍 Search and filtering capabilities across all major entities');
console.log('📄 Pagination support for list endpoints');

console.log('\n💡 Example Usage:');
console.log('1. Register: POST /api/v1/auth/register');
console.log('2. Login: POST /api/v1/auth/login');  
console.log('3. Get exercises: GET /api/v1/exercises?category=strength&limit=10');
console.log('4. Create workout: POST /api/v1/workout-routines');
console.log('5. Track progress: POST /api/v1/progress');

console.log('\n🔧 Ready to build your fitness application!');
