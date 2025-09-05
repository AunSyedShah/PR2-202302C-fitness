import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

// User Model
const userSchema = new Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false
  },
  name: {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    }
  },
  profilePicture: {
    type: String,
    default: null,
    match: [/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i, 'Profile picture must be a valid image URL']
  },
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(value) {
        return value < new Date();
      },
      message: 'Date of birth cannot be in the future'
    }
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say'],
    default: 'prefer-not-to-say'
  },
  height: {
    value: {
      type: Number,
      min: [50, 'Height must be at least 50 cm'],
      max: [300, 'Height cannot exceed 300 cm']
    },
    unit: {
      type: String,
      enum: ['cm', 'feet'],
      default: 'cm'
    }
  },
  preferences: {
    notifications: {
      workoutReminders: { type: Boolean, default: true },
      mealReminders: { type: Boolean, default: true },
      goalAchievements: { type: Boolean, default: true },
      socialUpdates: { type: Boolean, default: false }
    },
    units: {
      weight: { type: String, enum: ['kg', 'lbs'], default: 'kg' },
      distance: { type: String, enum: ['km', 'miles'], default: 'km' },
      temperature: { type: String, enum: ['celsius', 'fahrenheit'], default: 'celsius' }
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  followers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      return ret;
    }
  }
});

// Password hashing middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Password comparison method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.name.firstName} ${this.name.lastName}`;
});

// Exercise Model
const exerciseSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Exercise name is required'],
    trim: true,
    maxlength: [100, 'Exercise name cannot exceed 100 characters']
  },
  category: {
    type: String,
    required: [true, 'Exercise category is required'],
    enum: ['strength', 'cardio', 'flexibility', 'balance', 'sports', 'other'],
    default: 'other'
  },
  muscleGroups: [{
    type: String,
    enum: [
      'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
      'core', 'abs', 'obliques', 'glutes', 'quadriceps', 'hamstrings',
      'calves', 'full-body', 'cardio'
    ]
  }],
  equipment: [{
    type: String,
    enum: [
      'barbell', 'dumbbell', 'kettlebell', 'resistance-band', 'cable',
      'bodyweight', 'machine', 'cardio-equipment', 'other', 'none'
    ]
  }],
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  instructions: [{
    type: String,
    maxlength: [200, 'Each instruction cannot exceed 200 characters']
  }],
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  isCustom: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.isCustom;
    }
  }
}, {
  timestamps: true
});

// Workout Routine Model
const workoutRoutineSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  name: {
    type: String,
    required: [true, 'Workout routine name is required'],
    trim: true,
    maxlength: [100, 'Workout routine name cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  exercises: [{
    exercise: {
      type: Schema.Types.ObjectId,
      ref: 'Exercise',
      required: [true, 'Exercise is required']
    },
    sets: {
      type: Number,
      required: [true, 'Number of sets is required'],
      min: [1, 'Must have at least 1 set'],
      max: [50, 'Cannot exceed 50 sets']
    },
    reps: {
      type: Number,
      min: [1, 'Must have at least 1 rep'],
      max: [1000, 'Cannot exceed 1000 reps']
    },
    weight: {
      value: {
        type: Number,
        min: [0, 'Weight cannot be negative']
      },
      unit: {
        type: String,
        enum: ['kg', 'lbs'],
        default: 'kg'
      }
    },
    duration: {
      type: Number,
      min: [0, 'Duration cannot be negative']
    },
    distance: {
      value: {
        type: Number,
        min: [0, 'Distance cannot be negative']
      },
      unit: {
        type: String,
        enum: ['km', 'miles', 'm', 'ft'],
        default: 'km'
      }
    },
    restTime: {
      type: Number,
      min: [0, 'Rest time cannot be negative'],
      default: 60
    },
    notes: {
      type: String,
      maxlength: [300, 'Notes cannot exceed 300 characters']
    }
  }],
  category: {
    type: String,
    enum: ['strength', 'cardio', 'flexibility', 'mixed', 'other'],
    default: 'mixed'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  estimatedDuration: {
    type: Number,
    min: [5, 'Workout duration must be at least 5 minutes'],
    max: [600, 'Workout duration cannot exceed 600 minutes']
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  isPublic: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Workout Session Model
const workoutSessionSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  routine: {
    type: Schema.Types.ObjectId,
    ref: 'WorkoutRoutine',
    required: [true, 'Workout routine is required']
  },
  startTime: {
    type: Date,
    required: [true, 'Start time is required']
  },
  endTime: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value > this.startTime;
      },
      message: 'End time must be after start time'
    }
  },
  actualExercises: [{
    exercise: {
      type: Schema.Types.ObjectId,
      ref: 'Exercise',
      required: [true, 'Exercise is required']
    },
    sets: [{
      reps: { type: Number, min: 0 },
      weight: {
        value: { type: Number, min: 0 },
        unit: { type: String, enum: ['kg', 'lbs'], default: 'kg' }
      },
      duration: { type: Number, min: 0 },
      distance: {
        value: { type: Number, min: 0 },
        unit: { type: String, enum: ['km', 'miles', 'm', 'ft'], default: 'km' }
      },
      completed: { type: Boolean, default: false }
    }],
    notes: {
      type: String,
      maxlength: [300, 'Notes cannot exceed 300 characters']
    }
  }],
  totalDuration: {
    type: Number,
    min: [0, 'Duration cannot be negative']
  },
  caloriesBurned: {
    type: Number,
    min: [0, 'Calories burned cannot be negative']
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['planned', 'in-progress', 'completed', 'cancelled'],
    default: 'planned'
  }
}, {
  timestamps: true
});

// Food Database Model
const foodSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Food name is required'],
    trim: true,
    maxlength: [100, 'Food name cannot exceed 100 characters']
  },
  brand: {
    type: String,
    trim: true,
    maxlength: [50, 'Brand name cannot exceed 50 characters']
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true,
    match: [/^\d{8,14}$/, 'Barcode must be 8-14 digits']
  },
  nutritionPer100g: {
    calories: {
      type: Number,
      required: [true, 'Calories per 100g is required'],
      min: [0, 'Calories cannot be negative']
    },
    protein: {
      type: Number,
      required: [true, 'Protein per 100g is required'],
      min: [0, 'Protein cannot be negative']
    },
    carbohydrates: {
      type: Number,
      required: [true, 'Carbohydrates per 100g is required'],
      min: [0, 'Carbohydrates cannot be negative']
    },
    fat: {
      type: Number,
      required: [true, 'Fat per 100g is required'],
      min: [0, 'Fat cannot be negative']
    },
    fiber: {
      type: Number,
      min: [0, 'Fiber cannot be negative'],
      default: 0
    },
    sugar: {
      type: Number,
      min: [0, 'Sugar cannot be negative'],
      default: 0
    },
    sodium: {
      type: Number,
      min: [0, 'Sodium cannot be negative'],
      default: 0
    }
  },
  category: {
    type: String,
    enum: [
      'vegetables', 'fruits', 'grains', 'protein', 'dairy', 'fats-oils',
      'beverages', 'snacks', 'condiments', 'supplements', 'other'
    ],
    default: 'other'
  },
  servingSizes: [{
    name: { type: String, required: true },
    weight: { type: Number, required: true, min: 0 },
    unit: { type: String, enum: ['g', 'ml', 'oz', 'cup', 'piece'], default: 'g' }
  }],
  isCustom: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.isCustom;
    }
  },
  verified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Nutrition Entry Model
const nutritionEntrySchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  meals: [{
    type: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'snack'],
      required: [true, 'Meal type is required']
    },
    foods: [{
      food: {
        type: Schema.Types.ObjectId,
        ref: 'Food',
        required: [true, 'Food is required']
      },
      quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [0.1, 'Quantity must be at least 0.1']
      },
      unit: {
        type: String,
        enum: ['g', 'ml', 'oz', 'cup', 'piece'],
        default: 'g'
      },
      calories: {
        type: Number,
        min: [0, 'Calories cannot be negative']
      },
      protein: {
        type: Number,
        min: [0, 'Protein cannot be negative']
      },
      carbohydrates: {
        type: Number,
        min: [0, 'Carbohydrates cannot be negative']
      },
      fat: {
        type: Number,
        min: [0, 'Fat cannot be negative']
      }
    }],
    totalCalories: {
      type: Number,
      min: [0, 'Total calories cannot be negative']
    },
    notes: {
      type: String,
      maxlength: [200, 'Notes cannot exceed 200 characters']
    }
  }],
  dailyTotals: {
    calories: {
      type: Number,
      min: [0, 'Total calories cannot be negative']
    },
    protein: {
      type: Number,
      min: [0, 'Total protein cannot be negative']
    },
    carbohydrates: {
      type: Number,
      min: [0, 'Total carbohydrates cannot be negative']
    },
    fat: {
      type: Number,
      min: [0, 'Total fat cannot be negative']
    }
  },
  waterIntake: {
    amount: {
      type: Number,
      min: [0, 'Water intake cannot be negative'],
      default: 0
    },
    unit: {
      type: String,
      enum: ['ml', 'oz', 'cups'],
      default: 'ml'
    }
  }
}, {
  timestamps: true
});

// Progress Tracking Model
const progressSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  type: {
    type: String,
    enum: ['weight', 'body-measurement', 'performance', 'photo'],
    required: [true, 'Progress type is required']
  },
  weight: {
    value: {
      type: Number,
      min: [20, 'Weight must be at least 20 kg'],
      max: [500, 'Weight cannot exceed 500 kg']
    },
    unit: {
      type: String,
      enum: ['kg', 'lbs'],
      default: 'kg'
    }
  },
  bodyMeasurements: {
    chest: { type: Number, min: 0 },
    waist: { type: Number, min: 0 },
    hips: { type: Number, min: 0 },
    biceps: { type: Number, min: 0 },
    thighs: { type: Number, min: 0 },
    neck: { type: Number, min: 0 },
    bodyFatPercentage: { 
      type: Number, 
      min: [3, 'Body fat percentage must be at least 3%'],
      max: [50, 'Body fat percentage cannot exceed 50%']
    },
    unit: {
      type: String,
      enum: ['cm', 'inches'],
      default: 'cm'
    }
  },
  performance: {
    exercise: {
      type: Schema.Types.ObjectId,
      ref: 'Exercise'
    },
    metric: {
      type: String,
      enum: ['max-weight', 'max-reps', 'best-time', 'distance', 'other']
    },
    value: {
      type: Number,
      min: [0, 'Performance value cannot be negative']
    },
    unit: {
      type: String,
      enum: ['kg', 'lbs', 'seconds', 'minutes', 'km', 'miles', 'reps']
    }
  },
  photos: [{
    url: {
      type: String,
      match: [/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i, 'Photo must be a valid image URL']
    },
    type: {
      type: String,
      enum: ['front', 'side', 'back', 'other'],
      default: 'front'
    }
  }],
  notes: {
    type: String,
    maxlength: [300, 'Notes cannot exceed 300 characters']
  }
}, {
  timestamps: true
});

// Goal Model
const goalSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  title: {
    type: String,
    required: [true, 'Goal title is required'],
    trim: true,
    maxlength: [100, 'Goal title cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  type: {
    type: String,
    enum: ['weight-loss', 'weight-gain', 'muscle-gain', 'strength', 'endurance', 'habit', 'other'],
    required: [true, 'Goal type is required']
  },
  targetValue: {
    type: Number,
    min: [0, 'Target value cannot be negative']
  },
  currentValue: {
    type: Number,
    min: [0, 'Current value cannot be negative'],
    default: 0
  },
  unit: {
    type: String,
    enum: ['kg', 'lbs', 'cm', 'inches', '%', 'days', 'times', 'minutes', 'hours']
  },
  targetDate: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value > new Date();
      },
      message: 'Target date must be in the future'
    }
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'cancelled'],
    default: 'active'
  },
  milestones: [{
    title: { type: String, required: true },
    value: { type: Number, required: true },
    achieved: { type: Boolean, default: false },
    achievedDate: { type: Date }
  }]
}, {
  timestamps: true
});

// Notification Model
const notificationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  type: {
    type: String,
    enum: [
      'workout-reminder', 'meal-reminder', 'goal-achievement', 'milestone-reached',
      'new-follower', 'workout-shared', 'system-update', 'other'
    ],
    required: [true, 'Notification type is required']
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    maxlength: [300, 'Message cannot exceed 300 characters']
  },
  isRead: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  },
  scheduledFor: {
    type: Date,
    default: Date.now
  },
  relatedEntity: {
    type: {
      type: String,
      enum: ['workout', 'goal', 'user', 'nutrition']
    },
    id: {
      type: Schema.Types.ObjectId,
      refPath: 'relatedEntity.type'
    }
  }
}, {
  timestamps: true
});

// Support Ticket Model
const supportTicketSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [100, 'Subject cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    enum: ['technical-issue', 'feature-request', 'account-issue', 'billing', 'feedback', 'other'],
    required: [true, 'Category is required']
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open'
  },
  attachments: [{
    filename: { type: String, required: true },
    url: { type: String, required: true },
    size: { type: Number, min: 0 }
  }],
  responses: [{
    message: {
      type: String,
      required: [true, 'Response message is required'],
      maxlength: [1000, 'Response cannot exceed 1000 characters']
    },
    isFromAdmin: {
      type: Boolean,
      default: false
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Social Features - Follow/Following relationship handled in User model
// Forum/Community Post Model (for social features)
const forumPostSchema = new Schema({
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author is required']
  },
  title: {
    type: String,
    required: [true, 'Post title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Post content is required'],
    maxlength: [5000, 'Content cannot exceed 5000 characters']
  },
  category: {
    type: String,
    enum: [
      'general-discussion', 'workout-tips', 'nutrition-advice', 'progress-sharing',
      'motivation', 'questions', 'success-stories', 'equipment-reviews'
    ],
    required: [true, 'Category is required']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'video', 'workout-routine']
    },
    url: { type: String },
    routineId: { type: Schema.Types.ObjectId, ref: 'WorkoutRoutine' }
  }],
  likes: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    likedAt: { type: Date, default: Date.now }
  }],
  replies: [{
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { 
      type: String, 
      required: true,
      maxlength: [2000, 'Reply cannot exceed 2000 characters']
    },
    likes: [{
      user: { type: Schema.Types.ObjectId, ref: 'User' },
      likedAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
  }],
  isPinned: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Report Model (for data export and reporting)
const reportSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  type: {
    type: String,
    enum: ['workout-summary', 'nutrition-summary', 'progress-report', 'comprehensive'],
    required: [true, 'Report type is required']
  },
  dateRange: {
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      validate: {
        validator: function(value) {
          return value >= this.dateRange.startDate;
        },
        message: 'End date must be after or equal to start date'
      }
    }
  },
  format: {
    type: String,
    enum: ['pdf', 'csv', 'json'],
    required: [true, 'Report format is required']
  },
  status: {
    type: String,
    enum: ['pending', 'generating', 'completed', 'failed'],
    default: 'pending'
  },
  fileUrl: {
    type: String,
    match: [/^https?:\/\/.+$/, 'File URL must be valid']
  },
  generatedAt: {
    type: Date
  },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    }
  }
}, {
  timestamps: true
});

// Reminder Model
const reminderSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  type: {
    type: String,
    enum: ['workout', 'meal', 'water', 'medication', 'custom'],
    required: [true, 'Reminder type is required']
  },
  title: {
    type: String,
    required: [true, 'Reminder title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [300, 'Description cannot exceed 300 characters']
  },
  schedule: {
    frequency: {
      type: String,
      enum: ['once', 'daily', 'weekly', 'monthly', 'custom'],
      required: [true, 'Frequency is required']
    },
    time: {
      type: String,
      required: [true, 'Time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format']
    },
    daysOfWeek: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    customDates: [{
      type: Date
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastTriggered: {
    type: Date
  },
  relatedEntity: {
    type: {
      type: String,
      enum: ['workout-routine', 'goal', 'meal-plan']
    },
    id: {
      type: Schema.Types.ObjectId,
      refPath: 'relatedEntity.type'
    }
  }
}, {
  timestamps: true
});

// Activity Log Model (for tracking user actions)
const activityLogSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    enum: [
      'workout-completed', 'workout-created', 'workout-updated', 'workout-deleted',
      'nutrition-logged', 'progress-recorded', 'goal-created', 'goal-achieved',
      'profile-updated', 'login', 'logout', 'follow-user', 'unfollow-user',
      'post-created', 'post-liked', 'post-replied'
    ]
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  relatedEntity: {
    type: {
      type: String,
      enum: ['workout-routine', 'workout-session', 'nutrition-entry', 'progress', 'goal', 'user', 'forum-post']
    },
    id: {
      type: Schema.Types.ObjectId,
      refPath: 'relatedEntity.type'
    }
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    match: [/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}$/, 'Invalid IP address format']
  },
  userAgent: {
    type: String,
    maxlength: [500, 'User agent cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Meal Plan Model
const mealPlanSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  name: {
    type: String,
    required: [true, 'Meal plan name is required'],
    trim: true,
    maxlength: [100, 'Meal plan name cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 day'],
    max: [365, 'Duration cannot exceed 365 days']
  },
  targetCalories: {
    type: Number,
    min: [800, 'Target calories must be at least 800'],
    max: [5000, 'Target calories cannot exceed 5000']
  },
  targetMacros: {
    protein: {
      type: Number,
      min: [0, 'Protein percentage cannot be negative'],
      max: [100, 'Protein percentage cannot exceed 100']
    },
    carbohydrates: {
      type: Number,
      min: [0, 'Carbohydrates percentage cannot be negative'],
      max: [100, 'Carbohydrates percentage cannot exceed 100']
    },
    fat: {
      type: Number,
      min: [0, 'Fat percentage cannot be negative'],
      max: [100, 'Fat percentage cannot exceed 100']
    }
  },
  days: [{
    dayNumber: {
      type: Number,
      required: [true, 'Day number is required'],
      min: [1, 'Day number must be at least 1']
    },
    meals: [{
      type: {
        type: String,
        enum: ['breakfast', 'lunch', 'dinner', 'snack'],
        required: [true, 'Meal type is required']
      },
      name: {
        type: String,
        required: [true, 'Meal name is required'],
        maxlength: [100, 'Meal name cannot exceed 100 characters']
      },
      foods: [{
        food: {
          type: Schema.Types.ObjectId,
          ref: 'Food',
          required: [true, 'Food is required']
        },
        quantity: {
          type: Number,
          required: [true, 'Quantity is required'],
          min: [0.1, 'Quantity must be at least 0.1']
        },
        unit: {
          type: String,
          enum: ['g', 'ml', 'oz', 'cup', 'piece'],
          default: 'g'
        }
      }],
      estimatedCalories: {
        type: Number,
        min: [0, 'Estimated calories cannot be negative']
      },
      preparationTime: {
        type: Number,
        min: [0, 'Preparation time cannot be negative']
      },
      notes: {
        type: String,
        maxlength: [200, 'Notes cannot exceed 200 characters']
      }
    }]
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  difficulty: {
    type: String,
    enum: ['easy', 'moderate', 'challenging'],
    default: 'moderate'
  }
}, {
  timestamps: true
});

// Workout Template Model (for community sharing)
const workoutTemplateSchema = new Schema({
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  name: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true,
    maxlength: [100, 'Template name cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    enum: ['strength', 'cardio', 'flexibility', 'mixed', 'rehabilitation', 'sport-specific'],
    required: [true, 'Category is required']
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: [true, 'Difficulty is required']
  },
  estimatedDuration: {
    type: Number,
    required: [true, 'Estimated duration is required'],
    min: [5, 'Duration must be at least 5 minutes'],
    max: [600, 'Duration cannot exceed 600 minutes']
  },
  exercises: [{
    exercise: {
      type: Schema.Types.ObjectId,
      ref: 'Exercise',
      required: [true, 'Exercise is required']
    },
    sets: {
      type: Number,
      required: [true, 'Number of sets is required'],
      min: [1, 'Must have at least 1 set'],
      max: [50, 'Cannot exceed 50 sets']
    },
    reps: {
      type: Number,
      min: [1, 'Must have at least 1 rep'],
      max: [1000, 'Cannot exceed 1000 reps']
    },
    duration: {
      type: Number,
      min: [0, 'Duration cannot be negative']
    },
    restTime: {
      type: Number,
      min: [0, 'Rest time cannot be negative'],
      default: 60
    },
    notes: {
      type: String,
      maxlength: [200, 'Notes cannot exceed 200 characters']
    }
  }],
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  equipment: [{
    type: String,
    enum: [
      'barbell', 'dumbbell', 'kettlebell', 'resistance-band', 'cable',
      'bodyweight', 'machine', 'cardio-equipment', 'other', 'none'
    ]
  }],
  ratings: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    rating: { 
      type: Number, 
      min: [1, 'Rating must be at least 1'], 
      max: [5, 'Rating cannot exceed 5'] 
    },
    review: {
      type: String,
      maxlength: [500, 'Review cannot exceed 500 characters']
    },
    ratedAt: { type: Date, default: Date.now }
  }],
  averageRating: {
    type: Number,
    min: [0, 'Average rating cannot be negative'],
    max: [5, 'Average rating cannot exceed 5'],
    default: 0
  },
  totalRatings: {
    type: Number,
    min: [0, 'Total ratings cannot be negative'],
    default: 0
  },
  downloads: {
    type: Number,
    min: [0, 'Downloads cannot be negative'],
    default: 0
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better query performance
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ 'name.firstName': 1, 'name.lastName': 1 });

exerciseSchema.index({ name: 1, category: 1 });
exerciseSchema.index({ muscleGroups: 1 });
exerciseSchema.index({ equipment: 1 });

workoutRoutineSchema.index({ user: 1, createdAt: -1 });
workoutRoutineSchema.index({ category: 1, difficulty: 1 });
workoutRoutineSchema.index({ tags: 1 });

workoutSessionSchema.index({ user: 1, startTime: -1 });
workoutSessionSchema.index({ routine: 1 });

foodSchema.index({ name: 1, brand: 1 });
foodSchema.index({ barcode: 1 });
foodSchema.index({ category: 1 });

nutritionEntrySchema.index({ user: 1, date: -1 });

progressSchema.index({ user: 1, date: -1, type: 1 });

goalSchema.index({ user: 1, status: 1 });
goalSchema.index({ targetDate: 1 });

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ scheduledFor: 1 });

supportTicketSchema.index({ user: 1, status: 1 });
supportTicketSchema.index({ category: 1, priority: 1 });

forumPostSchema.index({ category: 1, createdAt: -1 });
forumPostSchema.index({ author: 1 });
forumPostSchema.index({ tags: 1 });

mealPlanSchema.index({ user: 1, createdAt: -1 });
mealPlanSchema.index({ isPublic: 1, tags: 1 });

workoutTemplateSchema.index({ category: 1, difficulty: 1, averageRating: -1 });
workoutTemplateSchema.index({ creator: 1 });
workoutTemplateSchema.index({ tags: 1, equipment: 1 });

reportSchema.index({ user: 1, createdAt: -1 });

reminderSchema.index({ user: 1, 'schedule.frequency': 1 });

activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ action: 1 });

// Create and export models
export const User = mongoose.model('User', userSchema);
export const Exercise = mongoose.model('Exercise', exerciseSchema);
export const WorkoutRoutine = mongoose.model('WorkoutRoutine', workoutRoutineSchema);
export const WorkoutSession = mongoose.model('WorkoutSession', workoutSessionSchema);
export const Food = mongoose.model('Food', foodSchema);
export const NutritionEntry = mongoose.model('NutritionEntry', nutritionEntrySchema);
export const Progress = mongoose.model('Progress', progressSchema);
export const Goal = mongoose.model('Goal', goalSchema);
export const Notification = mongoose.model('Notification', notificationSchema);
export const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);
export const ForumPost = mongoose.model('ForumPost', forumPostSchema);
export const MealPlan = mongoose.model('MealPlan', mealPlanSchema);
export const WorkoutTemplate = mongoose.model('WorkoutTemplate', workoutTemplateSchema);
export const Report = mongoose.model('Report', reportSchema);
export const Reminder = mongoose.model('Reminder', reminderSchema);
export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);