import mongoose from 'mongoose';

const { Schema } = mongoose;

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

export default mongoose.model('Food', foodSchema);
