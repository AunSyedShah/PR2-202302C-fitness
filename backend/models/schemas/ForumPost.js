import mongoose from 'mongoose';

const { Schema } = mongoose;

const forumPostSchema = new Schema({
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author is required']
  },
  title: {
    type: String,
    required: [true, 'Post title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Post content is required'],
    maxlength: [5000, 'Content cannot exceed 5000 characters']
  },
  category: {
    type: String,
    enum: [
      'general-discussion', 'workout-tips', 'nutrition-advice', 'progress-sharing',
      'motivation', 'questions', 'success-stories', 'equipment-reviews'
    ],
    required: [true, 'Category is required']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'video', 'workout-routine']
    },
    url: { type: String },
    routineId: { type: Schema.Types.ObjectId, ref: 'WorkoutRoutine' }
  }],
  likes: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    likedAt: { type: Date, default: Date.now }
  }],
  replies: [{
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { 
      type: String, 
      required: true,
      maxlength: [2000, 'Reply cannot exceed 2000 characters']
    },
    likes: [{
      user: { type: Schema.Types.ObjectId, ref: 'User' },
      likedAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
  }],
  isPinned: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

export default mongoose.model('ForumPost', forumPostSchema);
