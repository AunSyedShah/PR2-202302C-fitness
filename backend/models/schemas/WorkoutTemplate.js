import mongoose from 'mongoose';

const { Schema } = mongoose;

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

export default mongoose.model('WorkoutTemplate', workoutTemplateSchema);
