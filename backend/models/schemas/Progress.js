import mongoose from 'mongoose';

const { Schema } = mongoose;

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

export default mongoose.model('Progress', progressSchema);
