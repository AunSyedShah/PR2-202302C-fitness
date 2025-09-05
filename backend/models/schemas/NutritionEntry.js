import mongoose from 'mongoose';

const { Schema } = mongoose;

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

export default mongoose.model('NutritionEntry', nutritionEntrySchema);
