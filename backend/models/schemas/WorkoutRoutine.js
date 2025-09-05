import mongoose from 'mongoose';

const { Schema } = mongoose;

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

export default mongoose.model('WorkoutRoutine', workoutRoutineSchema);
