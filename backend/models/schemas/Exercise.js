import mongoose from 'mongoose';

const { Schema } = mongoose;

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

export default mongoose.model('Exercise', exerciseSchema);
