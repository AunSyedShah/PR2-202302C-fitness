import mongoose from 'mongoose';

const { Schema } = mongoose;

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

export default mongoose.model('MealPlan', mealPlanSchema);
