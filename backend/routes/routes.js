import express from 'express';
import jwt from 'jsonwebtoken';
import { body, param, query, validationResult } from 'express-validator';
import multer from 'multer';
import {
  User, Exercise, WorkoutRoutine, WorkoutSession, Food, NutritionEntry,
  Progress, Goal, Notification, SupportTicket, ForumPost, MealPlan,
  WorkoutTemplate, Report, Reminder, ActivityLog
} from '../models/models.js';

const router = express.Router();

// Middleware for authentication
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array() 
    });
  }
  next();
};

// Activity logging middleware
const logActivity = (action, description) => {
  return async (req, res, next) => {
    try {
      if (req.user) {
        await ActivityLog.create({
          user: req.user._id,
          action,
          description,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          metadata: req.body
        });
      }
    } catch (error) {
      console.error('Activity logging failed:', error);
    }
    next();
  };
};

// ======================
// AUTH ROUTES
// ======================

// User Registration
router.post('/auth/register', [
  body('username')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 characters, letters, numbers, and underscores only'),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').trim().isLength({ min: 1, max: 50 }),
  body('lastName').trim().isLength({ min: 1, max: 50 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, profilePicture } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        field: existingUser.email === email ? 'email' : 'username'
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      name: { firstName, lastName },
      profilePicture
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});

// User Login
router.post('/auth/login', [
  body('identifier').notEmpty().withMessage('Username or email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Find user by username or email
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier }
      ]
    }).select('+password');

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Log activity
    await ActivityLog.create({
      user: user._id,
      action: 'login',
      description: 'User logged in',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        profilePicture: user.profilePicture,
        preferences: user.preferences
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// ======================
// USER PROFILE ROUTES
// ======================

// Get current user profile
router.get('/users/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('followers', 'username name.firstName name.lastName profilePicture')
      .populate('following', 'username name.firstName name.lastName profilePicture');

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile', details: error.message });
  }
});

// Update user profile
router.put('/users/profile', [
  authenticateToken,
  body('name.firstName').optional().trim().isLength({ min: 1, max: 50 }),
  body('name.lastName').optional().trim().isLength({ min: 1, max: 50 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('profilePicture').optional().isURL(),
  handleValidationErrors,
  logActivity('profile-updated', 'User updated their profile')
], async (req, res) => {
  try {
    const allowedUpdates = ['name', 'email', 'profilePicture', 'dateOfBirth', 'gender', 'height', 'preferences'];
    const updates = {};

    // Filter allowed updates
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile', details: error.message });
  }
});

// Search users
router.get('/users/search', [
  authenticateToken,
  query('q').notEmpty().withMessage('Search query is required'),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        { isActive: true },
        {
          $or: [
            { username: { $regex: q, $options: 'i' } },
            { 'name.firstName': { $regex: q, $options: 'i' } },
            { 'name.lastName': { $regex: q, $options: 'i' } }
          ]
        }
      ]
    })
    .select('username name profilePicture')
    .limit(parseInt(limit));

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
});

// Follow/Unfollow user
router.post('/users/:userId/follow', [
  authenticateToken,
  param('userId').isMongoId(),
  handleValidationErrors,
  logActivity('follow-user', 'User followed another user')
], async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already following
    const isFollowing = req.user.following.includes(userId);
    
    if (isFollowing) {
      // Unfollow
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { following: userId }
      });
      await User.findByIdAndUpdate(userId, {
        $pull: { followers: req.user._id }
      });
      
      res.json({ message: 'User unfollowed successfully', action: 'unfollowed' });
    } else {
      // Follow
      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { following: userId }
      });
      await User.findByIdAndUpdate(userId, {
        $addToSet: { followers: req.user._id }
      });

      // Create notification
      await Notification.create({
        user: userId,
        type: 'new-follower',
        title: 'New Follower',
        message: `${req.user.fullName} started following you`
      });
      
      res.json({ message: 'User followed successfully', action: 'followed' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Follow operation failed', details: error.message });
  }
});

// ======================
// EXERCISE ROUTES
// ======================

// Get all exercises with filtering
router.get('/exercises', [
  authenticateToken,
  query('category').optional().isIn(['strength', 'cardio', 'flexibility', 'balance', 'sports', 'other']),
  query('muscleGroup').optional().isString(),
  query('equipment').optional().isString(),
  query('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']),
  query('search').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { category, muscleGroup, equipment, difficulty, search, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    
    if (category) filter.category = category;
    if (muscleGroup) filter.muscleGroups = { $in: [muscleGroup] };
    if (equipment) filter.equipment = { $in: [equipment] };
    if (difficulty) filter.difficulty = difficulty;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const exercises = await Exercise.find(filter)
      .populate('createdBy', 'username name')
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Exercise.countDocuments(filter);

    res.json({
      exercises,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: exercises.length,
        totalRecords: total
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch exercises', details: error.message });
  }
});

// Get single exercise
router.get('/exercises/:id', [
  authenticateToken,
  param('id').isMongoId(),
  handleValidationErrors
], async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id)
      .populate('createdBy', 'username name profilePicture');
    
    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    res.json({ exercise });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch exercise', details: error.message });
  }
});

// Create custom exercise
router.post('/exercises', [
  authenticateToken,
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('category').isIn(['strength', 'cardio', 'flexibility', 'balance', 'sports', 'other']),
  body('muscleGroups').optional().isArray(),
  body('equipment').optional().isArray(),
  body('description').optional().isLength({ max: 500 }),
  body('instructions').optional().isArray(),
  body('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']),
  handleValidationErrors,
  logActivity('exercise-created', 'User created a custom exercise')
], async (req, res) => {
  try {
    const exerciseData = {
      ...req.body,
      isCustom: true,
      createdBy: req.user._id
    };

    const exercise = new Exercise(exerciseData);
    await exercise.save();
    await exercise.populate('createdBy', 'username name');

    res.status(201).json({ 
      message: 'Exercise created successfully', 
      exercise 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create exercise', details: error.message });
  }
});

// Update custom exercise
router.put('/exercises/:id', [
  authenticateToken,
  param('id').isMongoId(),
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('category').optional().isIn(['strength', 'cardio', 'flexibility', 'balance', 'sports', 'other']),
  handleValidationErrors,
  logActivity('exercise-updated', 'User updated a custom exercise')
], async (req, res) => {
  try {
    const exercise = await Exercise.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
      isCustom: true
    });

    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found or not authorized' });
    }

    Object.assign(exercise, req.body);
    await exercise.save();
    await exercise.populate('createdBy', 'username name');

    res.json({ message: 'Exercise updated successfully', exercise });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update exercise', details: error.message });
  }
});

// Delete custom exercise
router.delete('/exercises/:id', [
  authenticateToken,
  param('id').isMongoId(),
  handleValidationErrors,
  logActivity('exercise-deleted', 'User deleted a custom exercise')
], async (req, res) => {
  try {
    const exercise = await Exercise.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
      isCustom: true
    });

    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found or not authorized' });
    }

    res.json({ message: 'Exercise deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete exercise', details: error.message });
  }
});

// ======================
// WORKOUT ROUTINE ROUTES
// ======================

// Get user's workout routines
router.get('/workout-routines', [
  authenticateToken,
  query('category').optional().isIn(['strength', 'cardio', 'flexibility', 'mixed', 'other']),
  query('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { category, difficulty, page = 1, limit = 20 } = req.query;
    
    const filter = { user: req.user._id };
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;

    const routines = await WorkoutRoutine.find(filter)
      .populate('exercises.exercise', 'name category muscleGroups')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await WorkoutRoutine.countDocuments(filter);

    res.json({
      routines,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: routines.length,
        totalRecords: total
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch routines', details: error.message });
  }
});

// Get single workout routine
router.get('/workout-routines/:id', [
  authenticateToken,
  param('id').isMongoId(),
  handleValidationErrors
], async (req, res) => {
  try {
    const routine = await WorkoutRoutine.findOne({
      _id: req.params.id,
      $or: [
        { user: req.user._id },
        { isPublic: true }
      ]
    }).populate('exercises.exercise', 'name category muscleGroups equipment');

    if (!routine) {
      return res.status(404).json({ error: 'Workout routine not found' });
    }

    res.json({ routine });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch routine', details: error.message });
  }
});

// Create workout routine
router.post('/workout-routines', [
  authenticateToken,
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('description').optional().isLength({ max: 500 }),
  body('exercises').isArray({ min: 1 }),
  body('exercises.*.exercise').isMongoId(),
  body('exercises.*.sets').isInt({ min: 1, max: 50 }),
  body('category').optional().isIn(['strength', 'cardio', 'flexibility', 'mixed', 'other']),
  body('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']),
  handleValidationErrors,
  logActivity('workout-created', 'User created a new workout routine')
], async (req, res) => {
  try {
    const routineData = {
      ...req.body,
      user: req.user._id
    };

    // Validate all exercises exist
    const exerciseIds = req.body.exercises.map(e => e.exercise);
    const exercises = await Exercise.find({ _id: { $in: exerciseIds } });
    
    if (exercises.length !== exerciseIds.length) {
      return res.status(400).json({ error: 'One or more exercises not found' });
    }

    const routine = new WorkoutRoutine(routineData);
    await routine.save();
    await routine.populate('exercises.exercise', 'name category');

    res.status(201).json({ 
      message: 'Workout routine created successfully', 
      routine 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create routine', details: error.message });
  }
});

// Update workout routine
router.put('/workout-routines/:id', [
  authenticateToken,
  param('id').isMongoId(),
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('exercises').optional().isArray({ min: 1 }),
  handleValidationErrors,
  logActivity('workout-updated', 'User updated a workout routine')
], async (req, res) => {
  try {
    const routine = await WorkoutRoutine.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!routine) {
      return res.status(404).json({ error: 'Workout routine not found' });
    }

    Object.assign(routine, req.body);
    await routine.save();
    await routine.populate('exercises.exercise', 'name category');

    res.json({ message: 'Routine updated successfully', routine });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update routine', details: error.message });
  }
});

// Delete workout routine
router.delete('/workout-routines/:id', [
  authenticateToken,
  param('id').isMongoId(),
  handleValidationErrors,
  logActivity('workout-deleted', 'User deleted a workout routine')
], async (req, res) => {
  try {
    const routine = await WorkoutRoutine.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!routine) {
      return res.status(404).json({ error: 'Workout routine not found' });
    }

    res.json({ message: 'Routine deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete routine', details: error.message });
  }
});

// ======================
// WORKOUT SESSION ROUTES
// ======================

// Start workout session
router.post('/workout-sessions/start', [
  authenticateToken,
  body('routineId').isMongoId(),
  handleValidationErrors,
  logActivity('workout-started', 'User started a workout session')
], async (req, res) => {
  try {
    const { routineId } = req.body;
    
    const routine = await WorkoutRoutine.findOne({
      _id: routineId,
      $or: [
        { user: req.user._id },
        { isPublic: true }
      ]
    });

    if (!routine) {
      return res.status(404).json({ error: 'Workout routine not found' });
    }

    const session = new WorkoutSession({
      user: req.user._id,
      routine: routineId,
      startTime: new Date(),
      status: 'in-progress'
    });

    await session.save();
    await session.populate('routine', 'name exercises');

    res.status(201).json({ 
      message: 'Workout session started', 
      session 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start workout', details: error.message });
  }
});

// Update workout session (log exercises)
router.put('/workout-sessions/:id', [
  authenticateToken,
  param('id').isMongoId(),
  body('actualExercises').optional().isArray(),
  body('status').optional().isIn(['planned', 'in-progress', 'completed', 'cancelled']),
  handleValidationErrors
], async (req, res) => {
  try {
    const session = await WorkoutSession.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!session) {
      return res.status(404).json({ error: 'Workout session not found' });
    }

    Object.assign(session, req.body);
    
    if (req.body.status === 'completed' && !session.endTime) {
      session.endTime = new Date();
      session.totalDuration = Math.round((session.endTime - session.startTime) / 1000 / 60);
    }

    await session.save();

    res.json({ message: 'Workout session updated', session });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update session', details: error.message });
  }
});

// Complete workout session
router.post('/workout-sessions/:id/complete', [
  authenticateToken,
  param('id').isMongoId(),
  body('caloriesBurned').optional().isNumeric(),
  body('notes').optional().isLength({ max: 500 }),
  handleValidationErrors,
  logActivity('workout-completed', 'User completed a workout session')
], async (req, res) => {
  try {
    const session = await WorkoutSession.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!session) {
      return res.status(404).json({ error: 'Workout session not found' });
    }

    session.status = 'completed';
    session.endTime = new Date();
    session.totalDuration = Math.round((session.endTime - session.startTime) / 1000 / 60);
    
    if (req.body.caloriesBurned) session.caloriesBurned = req.body.caloriesBurned;
    if (req.body.notes) session.notes = req.body.notes;

    await session.save();

    // Create completion notification
    await Notification.create({
      user: req.user._id,
      type: 'workout-completion',
      title: 'Workout Completed!',
      message: `Great job completing your ${session.totalDuration} minute workout!`
    });

    res.json({ message: 'Workout completed successfully', session });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete workout', details: error.message });
  }
});

// Get workout sessions history
router.get('/workout-sessions', [
  authenticateToken,
  query('status').optional().isIn(['planned', 'in-progress', 'completed', 'cancelled']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { status, startDate, endDate, page = 1, limit = 20 } = req.query;
    
    const filter = { user: req.user._id };
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.startTime = {};
      if (startDate) filter.startTime.$gte = new Date(startDate);
      if (endDate) filter.startTime.$lte = new Date(endDate);
    }

    const sessions = await WorkoutSession.find(filter)
      .populate('routine', 'name category')
      .populate('actualExercises.exercise', 'name category')
      .sort({ startTime: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await WorkoutSession.countDocuments(filter);

    res.json({
      sessions,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: sessions.length,
        totalRecords: total
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions', details: error.message });
  }
});

// ======================
// FOOD ROUTES
// ======================

// Search foods
router.get('/foods/search', [
  authenticateToken,
  query('q').notEmpty().withMessage('Search query is required'),
  query('category').optional().isString(),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { q, category, limit = 20 } = req.query;
    
    const filter = {
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { brand: { $regex: q, $options: 'i' } }
      ]
    };
    
    if (category) filter.category = category;

    const foods = await Food.find(filter)
      .populate('createdBy', 'username')
      .sort({ verified: -1, name: 1 })
      .limit(parseInt(limit));

    res.json({ foods });
  } catch (error) {
    res.status(500).json({ error: 'Food search failed', details: error.message });
  }
});

// Get food by barcode
router.get('/foods/barcode/:barcode', [
  authenticateToken,
  param('barcode').matches(/^\d{8,14}$/),
  handleValidationErrors
], async (req, res) => {
  try {
    const food = await Food.findOne({ barcode: req.params.barcode })
      .populate('createdBy', 'username');

    if (!food) {
      return res.status(404).json({ error: 'Food not found' });
    }

    res.json({ food });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch food', details: error.message });
  }
});

// Create custom food
router.post('/foods', [
  authenticateToken,
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('nutritionPer100g.calories').isNumeric({ min: 0 }),
  body('nutritionPer100g.protein').isNumeric({ min: 0 }),
  body('nutritionPer100g.carbohydrates').isNumeric({ min: 0 }),
  body('nutritionPer100g.fat').isNumeric({ min: 0 }),
  body('category').optional().isIn([
    'vegetables', 'fruits', 'grains', 'protein', 'dairy', 'fats-oils',
    'beverages', 'snacks', 'condiments', 'supplements', 'other'
  ]),
  handleValidationErrors
], async (req, res) => {
  try {
    const foodData = {
      ...req.body,
      isCustom: true,
      createdBy: req.user._id
    };

    const food = new Food(foodData);
    await food.save();

    res.status(201).json({ 
      message: 'Food created successfully', 
      food 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create food', details: error.message });
  }
});

// ======================
// NUTRITION ENTRY ROUTES
// ======================

// Get nutrition entries
router.get('/nutrition-entries', [
  authenticateToken,
  query('date').optional().isISO8601(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 31 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { date, startDate, endDate, page = 1, limit = 7 } = req.query;
    
    const filter = { user: req.user._id };
    
    if (date) {
      const queryDate = new Date(date);
      filter.date = {
        $gte: new Date(queryDate.setHours(0, 0, 0, 0)),
        $lt: new Date(queryDate.setHours(23, 59, 59, 999))
      };
    } else if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const entries = await NutritionEntry.find(filter)
      .populate('meals.foods.food', 'name brand nutritionPer100g')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await NutritionEntry.countDocuments(filter);

    res.json({
      entries,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: entries.length,
        totalRecords: total
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch nutrition entries', details: error.message });
  }
});

// Log nutrition entry
router.post('/nutrition-entries', [
  authenticateToken,
  body('date').optional().isISO8601(),
  body('meals').isArray({ min: 1 }),
  body('meals.*.type').isIn(['breakfast', 'lunch', 'dinner', 'snack']),
  body('meals.*.foods').isArray({ min: 1 }),
  body('meals.*.foods.*.food').isMongoId(),
  body('meals.*.foods.*.quantity').isNumeric({ min: 0.1 }),
  handleValidationErrors,
  logActivity('nutrition-logged', 'User logged nutrition entry')
], async (req, res) => {
  try {
    const entryData = {
      ...req.body,
      user: req.user._id,
      date: req.body.date || new Date()
    };

    // Calculate nutritional totals for each meal and daily totals
    let dailyTotals = { calories: 0, protein: 0, carbohydrates: 0, fat: 0 };

    for (let meal of entryData.meals) {
      let mealTotals = { calories: 0, protein: 0, carbohydrates: 0, fat: 0 };
      
      for (let foodEntry of meal.foods) {
        const food = await Food.findById(foodEntry.food);
        if (!food) continue;

        const multiplier = foodEntry.quantity / 100; // nutrition is per 100g
        
        foodEntry.calories = Math.round(food.nutritionPer100g.calories * multiplier);
        foodEntry.protein = Math.round(food.nutritionPer100g.protein * multiplier * 10) / 10;
        foodEntry.carbohydrates = Math.round(food.nutritionPer100g.carbohydrates * multiplier * 10) / 10;
        foodEntry.fat = Math.round(food.nutritionPer100g.fat * multiplier * 10) / 10;

        mealTotals.calories += foodEntry.calories;
        mealTotals.protein += foodEntry.protein;
        mealTotals.carbohydrates += foodEntry.carbohydrates;
        mealTotals.fat += foodEntry.fat;
      }

      meal.totalCalories = Math.round(mealTotals.calories);
      dailyTotals.calories += mealTotals.calories;
      dailyTotals.protein += mealTotals.protein;
      dailyTotals.carbohydrates += mealTotals.carbohydrates;
      dailyTotals.fat += mealTotals.fat;
    }

    entryData.dailyTotals = {
      calories: Math.round(dailyTotals.calories),
      protein: Math.round(dailyTotals.protein * 10) / 10,
      carbohydrates: Math.round(dailyTotals.carbohydrates * 10) / 10,
      fat: Math.round(dailyTotals.fat * 10) / 10
    };

    const entry = new NutritionEntry(entryData);
    await entry.save();
    await entry.populate('meals.foods.food', 'name brand');

    res.status(201).json({ 
      message: 'Nutrition entry logged successfully', 
      entry 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log nutrition', details: error.message });
  }
});

// ======================
// PROGRESS ROUTES
// ======================

// Get progress entries
router.get('/progress', [
  authenticateToken,
  query('type').optional().isIn(['weight', 'body-measurement', 'performance', 'photo']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { type, startDate, endDate, page = 1, limit = 50 } = req.query;
    
    const filter = { user: req.user._id };
    if (type) filter.type = type;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const progress = await Progress.find(filter)
      .populate('performance.exercise', 'name category')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Progress.countDocuments(filter);

    res.json({
      progress,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: progress.length,
        totalRecords: total
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch progress', details: error.message });
  }
});

// Record progress entry
router.post('/progress', [
  authenticateToken,
  body('type').isIn(['weight', 'body-measurement', 'performance', 'photo']),
  body('date').optional().isISO8601(),
  body('weight.value').optional().isFloat({ min: 20, max: 500 }),
  body('weight.unit').optional().isIn(['kg', 'lbs']),
  handleValidationErrors,
  logActivity('progress-recorded', 'User recorded progress entry')
], async (req, res) => {
  try {
    const progressData = {
      user: req.user._id,
      ...req.body
    };

    if (!progressData.date) {
      progressData.date = new Date();
    }

    const progress = new Progress(progressData);
    await progress.save();

    await progress.populate('performance.exercise', 'name category');

    res.status(201).json({ 
      message: 'Progress recorded successfully', 
      progress 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record progress', details: error.message });
  }
});

// Update progress entry
router.put('/progress/:id', [
  authenticateToken,
  param('id').isMongoId(),
  body('type').optional().isIn(['weight', 'body-measurement', 'performance', 'photo']),
  body('weight.value').optional().isFloat({ min: 20, max: 500 }),
  body('weight.unit').optional().isIn(['kg', 'lbs']),
  handleValidationErrors
], async (req, res) => {
  try {
    const progress = await Progress.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    ).populate('performance.exercise', 'name category');

    if (!progress) {
      return res.status(404).json({ error: 'Progress entry not found' });
    }

    res.json({ message: 'Progress updated successfully', progress });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update progress', details: error.message });
  }
});

// Delete progress entry
router.delete('/progress/:id', [
  authenticateToken,
  param('id').isMongoId(),
  handleValidationErrors
], async (req, res) => {
  try {
    const progress = await Progress.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!progress) {
      return res.status(404).json({ error: 'Progress entry not found' });
    }

    res.json({ message: 'Progress entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete progress', details: error.message });
  }
});

// ======================
// GOAL ROUTES
// ======================

// Get user goals
router.get('/goals', [
  authenticateToken,
  query('status').optional().isIn(['active', 'paused', 'completed', 'cancelled']),
  query('type').optional().isIn(['weight-loss', 'weight-gain', 'muscle-gain', 'strength', 'endurance', 'habit', 'other']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    
    const filter = { user: req.user._id };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const goals = await Goal.find(filter)
      .sort({ priority: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Goal.countDocuments(filter);

    res.json({
      goals,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: goals.length,
        totalRecords: total
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch goals', details: error.message });
  }
});

// Create goal
router.post('/goals', [
  authenticateToken,
  body('title').trim().isLength({ min: 1, max: 100 }),
  body('type').isIn(['weight-loss', 'weight-gain', 'muscle-gain', 'strength', 'endurance', 'habit', 'other']),
  body('targetValue').optional().isFloat({ min: 0 }),
  body('targetDate').optional().isISO8601(),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  handleValidationErrors,
  logActivity('goal-created', 'User created a new goal')
], async (req, res) => {
  try {
    const goalData = {
      user: req.user._id,
      ...req.body
    };

    const goal = new Goal(goalData);
    await goal.save();

    res.status(201).json({ 
      message: 'Goal created successfully', 
      goal 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create goal', details: error.message });
  }
});

// Update goal
router.put('/goals/:id', [
  authenticateToken,
  param('id').isMongoId(),
  body('title').optional().trim().isLength({ min: 1, max: 100 }),
  body('currentValue').optional().isFloat({ min: 0 }),
  body('status').optional().isIn(['active', 'paused', 'completed', 'cancelled']),
  handleValidationErrors
], async (req, res) => {
  try {
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json({ message: 'Goal updated successfully', goal });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update goal', details: error.message });
  }
});

// Delete goal
router.delete('/goals/:id', [
  authenticateToken,
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

// ======================
// NOTIFICATION ROUTES
// ======================

// Get user notifications
router.get('/notifications', [
  authenticateToken,
  query('isRead').optional().isBoolean(),
  query('type').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { isRead, type, page = 1, limit = 20 } = req.query;
    
    const filter = { user: req.user._id };
    if (isRead !== undefined) filter.isRead = isRead === 'true';
    if (type) filter.type = type;

    const notifications = await Notification.find(filter)
      .sort({ scheduledFor: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ 
      user: req.user._id, 
      isRead: false 
    });

    res.json({
      notifications,
      unreadCount,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: notifications.length,
        totalRecords: total
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications', details: error.message });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', [
  authenticateToken,
  param('id').isMongoId(),
  handleValidationErrors
], async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification', details: error.message });
  }
});

// Mark all notifications as read
router.put('/notifications/mark-all-read', [
  authenticateToken
], async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { isRead: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notifications as read', details: error.message });
  }
});

// ======================
// SUPPORT TICKET ROUTES
// ======================

// Get user support tickets
router.get('/support-tickets', [
  authenticateToken,
  query('status').optional().isIn(['open', 'in-progress', 'resolved', 'closed']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const filter = { user: req.user._id };
    if (status) filter.status = status;

    const tickets = await SupportTicket.find(filter)
      .populate('assignedTo', 'username name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await SupportTicket.countDocuments(filter);

    res.json({
      tickets,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: tickets.length,
        totalRecords: total
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch support tickets', details: error.message });
  }
});

// Create support ticket
router.post('/support-tickets', [
  authenticateToken,
  body('subject').trim().isLength({ min: 1, max: 100 }),
  body('description').trim().isLength({ min: 1, max: 1000 }),
  body('category').isIn(['technical-issue', 'feature-request', 'account-issue', 'billing', 'feedback', 'other']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  handleValidationErrors
], async (req, res) => {
  try {
    const ticketData = {
      user: req.user._id,
      ...req.body
    };

    const ticket = new SupportTicket(ticketData);
    await ticket.save();

    res.status(201).json({ 
      message: 'Support ticket created successfully', 
      ticket 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create support ticket', details: error.message });
  }
});

// Add response to support ticket
router.post('/support-tickets/:id/responses', [
  authenticateToken,
  param('id').isMongoId(),
  body('message').trim().isLength({ min: 1, max: 1000 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    ticket.responses.push({
      message: req.body.message,
      isFromAdmin: false
    });

    await ticket.save();

    res.json({ message: 'Response added successfully', ticket });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add response', details: error.message });
  }
});

// ======================
// FORUM POST ROUTES
// ======================

// Get forum posts
router.get('/forum-posts', [
  authenticateToken,
  query('category').optional().isString(),
  query('search').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const posts = await ForumPost.find(filter)
      .populate('author', 'username name profilePicture')
      .populate('replies.author', 'username name profilePicture')
      .sort({ isPinned: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ForumPost.countDocuments(filter);

    res.json({
      posts,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: posts.length,
        totalRecords: total
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch forum posts', details: error.message });
  }
});

// Create forum post
router.post('/forum-posts', [
  authenticateToken,
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('content').trim().isLength({ min: 1, max: 5000 }),
  body('category').isIn(['general-discussion', 'workout-tips', 'nutrition-advice', 'progress-sharing', 'motivation', 'questions', 'success-stories', 'equipment-reviews']),
  body('tags').optional().isArray(),
  handleValidationErrors,
  logActivity('post-created', 'User created a forum post')
], async (req, res) => {
  try {
    const postData = {
      author: req.user._id,
      ...req.body
    };

    const post = new ForumPost(postData);
    await post.save();

    await post.populate('author', 'username name profilePicture');

    res.status(201).json({ 
      message: 'Forum post created successfully', 
      post 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create forum post', details: error.message });
  }
});

// Like/Unlike forum post
router.post('/forum-posts/:id/like', [
  authenticateToken,
  param('id').isMongoId(),
  handleValidationErrors,
  logActivity('post-liked', 'User liked a forum post')
], async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Forum post not found' });
    }

    const existingLike = post.likes.find(like => 
      like.user.toString() === req.user._id.toString()
    );

    if (existingLike) {
      // Unlike
      post.likes = post.likes.filter(like => 
        like.user.toString() !== req.user._id.toString()
      );
      await post.save();
      res.json({ message: 'Post unliked successfully', liked: false });
    } else {
      // Like
      post.likes.push({ user: req.user._id });
      await post.save();
      res.json({ message: 'Post liked successfully', liked: true });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to like/unlike post', details: error.message });
  }
});

// Add reply to forum post
router.post('/forum-posts/:id/replies', [
  authenticateToken,
  param('id').isMongoId(),
  body('content').trim().isLength({ min: 1, max: 2000 }),
  handleValidationErrors,
  logActivity('post-replied', 'User replied to a forum post')
], async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Forum post not found' });
    }

    if (post.isLocked) {
      return res.status(403).json({ error: 'Post is locked for replies' });
    }

    post.replies.push({
      author: req.user._id,
      content: req.body.content
    });

    await post.save();
    await post.populate('replies.author', 'username name profilePicture');

    res.json({ message: 'Reply added successfully', post });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add reply', details: error.message });
  }
});

// ======================
// MEAL PLAN ROUTES
// ======================

// Get meal plans
router.get('/meal-plans', [
  authenticateToken,
  query('isPublic').optional().isBoolean(),
  query('search').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { isPublic, search, page = 1, limit = 20 } = req.query;
    
    const filter = { user: req.user._id };
    if (isPublic !== undefined) filter.isPublic = isPublic === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const mealPlans = await MealPlan.find(filter)
      .populate('days.meals.foods.food', 'name brand')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await MealPlan.countDocuments(filter);

    res.json({
      mealPlans,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: mealPlans.length,
        totalRecords: total
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch meal plans', details: error.message });
  }
});

// Create meal plan
router.post('/meal-plans', [
  authenticateToken,
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('duration').isInt({ min: 1, max: 365 }),
  body('targetCalories').optional().isInt({ min: 800, max: 5000 }),
  body('isPublic').optional().isBoolean(),
  handleValidationErrors
], async (req, res) => {
  try {
    const mealPlanData = {
      user: req.user._id,
      ...req.body
    };

    const mealPlan = new MealPlan(mealPlanData);
    await mealPlan.save();

    res.status(201).json({ 
      message: 'Meal plan created successfully', 
      mealPlan 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create meal plan', details: error.message });
  }
});

// Update meal plan
router.put('/meal-plans/:id', [
  authenticateToken,
  param('id').isMongoId(),
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('targetCalories').optional().isInt({ min: 800, max: 5000 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const mealPlan = await MealPlan.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    ).populate('days.meals.foods.food', 'name brand');

    if (!mealPlan) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    res.json({ message: 'Meal plan updated successfully', mealPlan });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update meal plan', details: error.message });
  }
});

// Delete meal plan
router.delete('/meal-plans/:id', [
  authenticateToken,
  param('id').isMongoId(),
  handleValidationErrors
], async (req, res) => {
  try {
    const mealPlan = await MealPlan.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!mealPlan) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    res.json({ message: 'Meal plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete meal plan', details: error.message });
  }
});

// ======================
// WORKOUT TEMPLATE ROUTES
// ======================

// Get workout templates
router.get('/workout-templates', [
  authenticateToken,
  query('category').optional().isIn(['strength', 'cardio', 'flexibility', 'mixed', 'rehabilitation', 'sport-specific']),
  query('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']),
  query('search').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { category, difficulty, search, page = 1, limit = 20 } = req.query;
    
    const filter = { isPublic: true };
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const templates = await WorkoutTemplate.find(filter)
      .populate('creator', 'username name profilePicture')
      .populate('exercises.exercise', 'name category')
      .sort({ isFeatured: -1, averageRating: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await WorkoutTemplate.countDocuments(filter);

    res.json({
      templates,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: templates.length,
        totalRecords: total
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workout templates', details: error.message });
  }
});

// Create workout template
router.post('/workout-templates', [
  authenticateToken,
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('category').isIn(['strength', 'cardio', 'flexibility', 'mixed', 'rehabilitation', 'sport-specific']),
  body('difficulty').isIn(['beginner', 'intermediate', 'advanced']),
  body('estimatedDuration').isInt({ min: 5, max: 600 }),
  body('exercises').isArray({ min: 1 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const templateData = {
      creator: req.user._id,
      ...req.body
    };

    const template = new WorkoutTemplate(templateData);
    await template.save();

    await template.populate('creator', 'username name profilePicture');
    await template.populate('exercises.exercise', 'name category');

    res.status(201).json({ 
      message: 'Workout template created successfully', 
      template 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create workout template', details: error.message });
  }
});

// Rate workout template
router.post('/workout-templates/:id/rate', [
  authenticateToken,
  param('id').isMongoId(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('review').optional().trim().isLength({ max: 500 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const template = await WorkoutTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ error: 'Workout template not found' });
    }

    // Remove existing rating by this user
    template.ratings = template.ratings.filter(rating => 
      rating.user.toString() !== req.user._id.toString()
    );

    // Add new rating
    template.ratings.push({
      user: req.user._id,
      rating: req.body.rating,
      review: req.body.review
    });

    // Calculate new average
    const totalRating = template.ratings.reduce((sum, r) => sum + r.rating, 0);
    template.averageRating = totalRating / template.ratings.length;
    template.totalRatings = template.ratings.length;

    await template.save();

    res.json({ message: 'Rating submitted successfully', template });
  } catch (error) {
    res.status(500).json({ error: 'Failed to rate template', details: error.message });
  }
});

// ======================
// REMINDER ROUTES
// ======================

// Get user reminders
router.get('/reminders', [
  authenticateToken,
  query('type').optional().isIn(['workout', 'meal', 'water', 'medication', 'custom']),
  query('isActive').optional().isBoolean(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { type, isActive } = req.query;
    
    const filter = { user: req.user._id };
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const reminders = await Reminder.find(filter)
      .sort({ isActive: -1, createdAt: -1 });

    res.json({ reminders });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reminders', details: error.message });
  }
});

// Create reminder
router.post('/reminders', [
  authenticateToken,
  body('type').isIn(['workout', 'meal', 'water', 'medication', 'custom']),
  body('title').trim().isLength({ min: 1, max: 100 }),
  body('schedule.frequency').isIn(['once', 'daily', 'weekly', 'monthly', 'custom']),
  body('schedule.time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  handleValidationErrors
], async (req, res) => {
  try {
    const reminderData = {
      user: req.user._id,
      ...req.body
    };

    const reminder = new Reminder(reminderData);
    await reminder.save();

    res.status(201).json({ 
      message: 'Reminder created successfully', 
      reminder 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create reminder', details: error.message });
  }
});

// Update reminder
router.put('/reminders/:id', [
  authenticateToken,
  param('id').isMongoId(),
  body('title').optional().trim().isLength({ min: 1, max: 100 }),
  body('isActive').optional().isBoolean(),
  handleValidationErrors
], async (req, res) => {
  try {
    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    res.json({ message: 'Reminder updated successfully', reminder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update reminder', details: error.message });
  }
});

// Delete reminder
router.delete('/reminders/:id', [
  authenticateToken,
  param('id').isMongoId(),
  handleValidationErrors
], async (req, res) => {
  try {
    const reminder = await Reminder.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    res.json({ message: 'Reminder deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete reminder', details: error.message });
  }
});

// ======================
// REPORT ROUTES
// ======================

// Request report generation
router.post('/reports', [
  authenticateToken,
  body('type').isIn(['workout-summary', 'nutrition-summary', 'progress-report', 'comprehensive']),
  body('dateRange.startDate').isISO8601(),
  body('dateRange.endDate').isISO8601(),
  body('format').isIn(['pdf', 'csv', 'json']),
  handleValidationErrors
], async (req, res) => {
  try {
    const reportData = {
      user: req.user._id,
      ...req.body
    };

    const report = new Report(reportData);
    await report.save();

    // In a real application, you would trigger report generation here
    // For now, we'll just simulate it
    setTimeout(async () => {
      try {
        report.status = 'completed';
        report.generatedAt = new Date();
        report.fileUrl = `https://api.fitness-app.com/reports/${report._id}/download`;
        await report.save();
      } catch (error) {
        console.error('Report generation failed:', error);
      }
    }, 5000);

    res.status(201).json({ 
      message: 'Report generation requested successfully', 
      report 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to request report', details: error.message });
  }
});

// Get user reports
router.get('/reports', [
  authenticateToken,
  query('status').optional().isIn(['pending', 'generating', 'completed', 'failed']),
  handleValidationErrors
], async (req, res) => {
  try {
    const { status } = req.query;
    
    const filter = { user: req.user._id };
    if (status) filter.status = status;

    const reports = await Report.find(filter)
      .sort({ createdAt: -1 });

    res.json({ reports });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports', details: error.message });
  }
});

// ======================
// ACTIVITY LOG ROUTES
// ======================

// Get user activity log
router.get('/activity-log', [
  authenticateToken,
  query('action').optional().isString(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { action, startDate, endDate, page = 1, limit = 50 } = req.query;
    
    const filter = { user: req.user._id };
    if (action) filter.action = action;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const activities = await ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ActivityLog.countDocuments(filter);

    res.json({
      activities,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: activities.length,
        totalRecords: total
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity log', details: error.message });
  }
});

export default router;