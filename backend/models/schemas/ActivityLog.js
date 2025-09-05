import mongoose from 'mongoose';

const { Schema } = mongoose;

const activityLogSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    enum: [
      'workout-completed', 'workout-created', 'workout-updated', 'workout-deleted',
      'nutrition-logged', 'progress-recorded', 'goal-created', 'goal-achieved',
      'profile-updated', 'login', 'logout', 'follow-user', 'unfollow-user',
      'post-created', 'post-liked', 'post-replied'
    ]
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  relatedEntity: {
    type: {
      type: String,
      enum: ['workout-routine', 'workout-session', 'nutrition-entry', 'progress', 'goal', 'user', 'forum-post']
    },
    id: {
      type: Schema.Types.ObjectId,
      refPath: 'relatedEntity.type'
    }
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    match: [/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}$/, 'Invalid IP address format']
  },
  userAgent: {
    type: String,
    maxlength: [500, 'User agent cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

export default mongoose.model('ActivityLog', activityLogSchema);
