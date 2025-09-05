import express from 'express';
import { body, query, param } from 'express-validator';
import { Exercise, WorkoutRoutine, WorkoutSession } from '../../models/models.js';
import { authenticateToken } from '../../middleware/auth.js';
import { handleValidationErrors, logActivity, paginate } from '../../middleware/common.js';

const router = express.Router();

// ======================
// EXERCISES
// ======================

// Get all exercises with filtering
router.get('/exercises', [
  authenticateToken,
  query('category').optional().isIn(['strength', 'cardio', 'flexibility', 'balance', 'sports', 'other']),
  query('muscleGroup').optional().isString(),
  query('equipment').optional().isString(),
  query('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']),
  query('search').optional().isString(),
  paginate,
  handleValidationErrors
], async (req, res) => {
  try {
    const { category, muscleGroup, equipment, difficulty, search } = req.query;
    const { page, limit, skip } = req.pagination;
    
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
      .skip(skip)
      .limit(limit);

    const total = await Exercise.countDocuments(filter);

    res.json({
      exercises,
      pagination: {
        current: page,
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

// ======================
// WORKOUT ROUTINES
// ======================

// Get user's workout routines
router.get('/routines', [
  authenticateToken,
  query('category').optional().isIn(['strength', 'cardio', 'flexibility', 'mixed', 'other']),
  query('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']),
  paginate,
  handleValidationErrors
], async (req, res) => {
  try {
    const { category, difficulty } = req.query;
    const { page, limit, skip } = req.pagination;
    
    const filter = { user: req.user._id };
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;

    const routines = await WorkoutRoutine.find(filter)
      .populate('exercises.exercise', 'name category muscleGroups')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await WorkoutRoutine.countDocuments(filter);

    res.json({
      routines,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: routines.length,
        totalRecords: total
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch routines', details: error.message });
  }
});

// Create workout routine
router.post('/routines', [
  authenticateToken,
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('exercises').isArray({ min: 1 }),
  body('exercises.*.exercise').isMongoId(),
  body('exercises.*.sets').isInt({ min: 1, max: 50 }),
  handleValidationErrors,
  logActivity('routine-created', 'User created a workout routine')
], async (req, res) => {
  try {
    const routineData = {
      user: req.user._id,
      ...req.body
    };

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

// ======================
// WORKOUT SESSIONS
// ======================

// Start workout session
router.post('/sessions/start', [
  authenticateToken,
  body('routine').isMongoId(),
  handleValidationErrors,
  logActivity('workout-started', 'User started a workout session')
], async (req, res) => {
  try {
    const { routine } = req.body;

    // Verify routine belongs to user
    const workoutRoutine = await WorkoutRoutine.findOne({
      _id: routine,
      user: req.user._id
    });

    if (!workoutRoutine) {
      return res.status(404).json({ error: 'Workout routine not found' });
    }

    const sessionData = {
      user: req.user._id,
      routine,
      startTime: new Date(),
      status: 'in-progress'
    };

    const session = new WorkoutSession(sessionData);
    await session.save();

    await session.populate('routine', 'name exercises');

    res.status(201).json({ 
      message: 'Workout session started successfully', 
      session 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start session', details: error.message });
  }
});

// Get workout sessions
router.get('/sessions', [
  authenticateToken,
  query('status').optional().isIn(['planned', 'in-progress', 'completed', 'cancelled']),
  paginate,
  handleValidationErrors
], async (req, res) => {
  try {
    const { status } = req.query;
    const { page, limit, skip } = req.pagination;
    
    const filter = { user: req.user._id };
    if (status) filter.status = status;

    const sessions = await WorkoutSession.find(filter)
      .populate('routine', 'name category')
      .populate('actualExercises.exercise', 'name')
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit);

    const total = await WorkoutSession.countDocuments(filter);

    res.json({
      sessions,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: sessions.length,
        totalRecords: total
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions', details: error.message });
  }
});

export default router;
