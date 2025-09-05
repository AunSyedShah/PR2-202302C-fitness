import mongoose from 'mongoose';

const { Schema } = mongoose;

const reminderSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  type: {
    type: String,
    enum: ['workout', 'meal', 'water', 'medication', 'custom'],
    required: [true, 'Reminder type is required']
  },
  title: {
    type: String,
    required: [true, 'Reminder title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [300, 'Description cannot exceed 300 characters']
  },
  schedule: {
    frequency: {
      type: String,
      enum: ['once', 'daily', 'weekly', 'monthly', 'custom'],
      required: [true, 'Frequency is required']
    },
    time: {
      type: String,
      required: [true, 'Time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format']
    },
    daysOfWeek: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    customDates: [{
      type: Date
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastTriggered: {
    type: Date
  },
  relatedEntity: {
    type: {
      type: String,
      enum: ['workout-routine', 'goal', 'meal-plan']
    },
    id: {
      type: Schema.Types.ObjectId,
      refPath: 'relatedEntity.type'
    }
  }
}, {
  timestamps: true
});

export default mongoose.model('Reminder', reminderSchema);
