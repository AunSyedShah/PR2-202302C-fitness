import mongoose from 'mongoose';

const { Schema } = mongoose;

const goalSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  title: {
    type: String,
    required: [true, 'Goal title is required'],
    trim: true,
    maxlength: [100, 'Goal title cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  type: {
    type: String,
    enum: ['weight-loss', 'weight-gain', 'muscle-gain', 'strength', 'endurance', 'habit', 'other'],
    required: [true, 'Goal type is required']
  },
  targetValue: {
    type: Number,
    min: [0, 'Target value cannot be negative']
  },
  currentValue: {
    type: Number,
    min: [0, 'Current value cannot be negative'],
    default: 0
  },
  unit: {
    type: String,
    enum: ['kg', 'lbs', 'cm', 'inches', '%', 'days', 'times', 'minutes', 'hours']
  },
  targetDate: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value > new Date();
      },
      message: 'Target date must be in the future'
    }
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'cancelled'],
    default: 'active'
  },
  milestones: [{
    title: { type: String, required: true },
    value: { type: Number, required: true },
    achieved: { type: Boolean, default: false },
    achievedDate: { type: Date }
  }]
}, {
  timestamps: true
});

export default mongoose.model('Goal', goalSchema);
