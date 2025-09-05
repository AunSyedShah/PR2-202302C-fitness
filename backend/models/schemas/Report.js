import mongoose from 'mongoose';

const { Schema } = mongoose;

const reportSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  type: {
    type: String,
    enum: ['workout-summary', 'nutrition-summary', 'progress-report', 'comprehensive'],
    required: [true, 'Report type is required']
  },
  dateRange: {
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      validate: {
        validator: function(value) {
          return value >= this.dateRange.startDate;
        },
        message: 'End date must be after or equal to start date'
      }
    }
  },
  format: {
    type: String,
    enum: ['pdf', 'csv', 'json'],
    required: [true, 'Report format is required']
  },
  status: {
    type: String,
    enum: ['pending', 'generating', 'completed', 'failed'],
    default: 'pending'
  },
  fileUrl: {
    type: String,
    match: [/^https?:\/\/.+$/, 'File URL must be valid']
  },
  generatedAt: {
    type: Date
  },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    }
  }
}, {
  timestamps: true
});

export default mongoose.model('Report', reportSchema);
