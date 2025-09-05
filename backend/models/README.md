# Models Directory

This directory contains all Mongoose models for the fitness application, now organized in a modular structure for better maintainability.

## Directory Structure

```
models/
├── index.js              # Main export file for all models
├── models.js              # Backward compatibility export (uses modular structure)
├── models.original.js     # Original monolithic models file (backup)
├── indexes.js             # Database indexes for performance optimization
└── schemas/               # Individual model files
    ├── User.js
    ├── Exercise.js
    ├── WorkoutRoutine.js
    ├── WorkoutSession.js
    ├── Food.js
    ├── NutritionEntry.js
    ├── Progress.js
    ├── Goal.js
    ├── Notification.js
    ├── SupportTicket.js
    ├── ForumPost.js
    ├── Report.js
    ├── Reminder.js
    ├── ActivityLog.js
    ├── MealPlan.js
    └── WorkoutTemplate.js
```

## Usage

### Importing All Models
```javascript
import { User, Exercise, WorkoutRoutine } from './models/index.js';
// or
import models from './models/index.js';
const { User, Exercise } = models;
```

### Importing Individual Models
```javascript
import User from './models/schemas/User.js';
import Exercise from './models/schemas/Exercise.js';
```

### Backward Compatibility
The existing import style still works:
```javascript
import { User, Exercise, WorkoutRoutine } from './models/models.js';
```

## Available Models

### Core Models
- **User**: User accounts, preferences, and social relationships
- **Exercise**: Exercise database with categories, muscle groups, and equipment
- **WorkoutRoutine**: User-created workout routines
- **WorkoutSession**: Actual workout sessions with tracking data

### Nutrition Models
- **Food**: Food database with nutritional information
- **NutritionEntry**: Daily food intake tracking
- **MealPlan**: Meal planning and preparation

### Progress & Goals
- **Progress**: Weight, measurements, performance, and photo progress
- **Goal**: User fitness goals with milestones

### Social & Community
- **ForumPost**: Community discussions and posts
- **WorkoutTemplate**: Shareable workout templates

### System Models
- **Notification**: System and user notifications
- **Reminder**: Workout, meal, and custom reminders
- **SupportTicket**: Customer support system
- **Report**: Data export and reporting
- **ActivityLog**: User activity tracking for analytics

## Database Indexes

Run the following to create all necessary database indexes:
```javascript
import { createIndexes } from './models/indexes.js';
await createIndexes();
```

## Model Features

### User Model
- Password hashing with bcrypt
- Email and username validation
- User preferences and settings
- Social features (followers/following)
- Profile management

### Security Features
- Password auto-hashing on save
- Email validation
- Input sanitization
- Field length limits
- Enum validations

### Performance Optimizations
- Strategic database indexes
- Optimized queries for common operations
- Proper field selection for sensitive data

## Migration Notes

- Original models.js moved to models.original.js
- All functionality preserved
- Backward compatibility maintained
- New modular structure for better organization
- Database indexes separated for easier management

## Development Guidelines

1. **Adding New Models**: Create in `/schemas` directory and export from `index.js`
2. **Model Modifications**: Edit individual schema files
3. **Index Management**: Update `indexes.js` for new fields requiring indexes
4. **Testing**: Ensure backward compatibility when making changes
