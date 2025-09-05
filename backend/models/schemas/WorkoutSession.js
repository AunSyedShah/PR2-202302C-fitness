import mongoose from 'mongoose';

const { Schema } = mongoose;

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

export default mongoose.model('WorkoutSession', workoutSessionSchema);
