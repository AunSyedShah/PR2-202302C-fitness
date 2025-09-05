import mongoose from 'mongoose';

const { Schema } = mongoose;

const notificationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  type: {
    type: String,
    enum: [
      'workout-reminder', 'meal-reminder', 'goal-achievement', 'milestone-reached',
      'new-follower', 'workout-shared', 'system-update', 'other'
    ],
    required: [true, 'Notification type is required']
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    maxlength: [300, 'Message cannot exceed 300 characters']
  },
  isRead: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  },
  scheduledFor: {
    type: Date,
    default: Date.now
  },
  relatedEntity: {
    type: {
      type: String,
      enum: ['workout', 'goal', 'user', 'nutrition']
    },
    id: {
      type: Schema.Types.ObjectId,
      refPath: 'relatedEntity.type'
    }
  }
}, {
  timestamps: true
});

export default mongoose.model('Notification', notificationSchema);
