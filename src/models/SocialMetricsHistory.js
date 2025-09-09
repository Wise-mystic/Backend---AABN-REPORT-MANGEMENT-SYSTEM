import mongoose from 'mongoose';

const socialMetricsHistorySchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    activity_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true, index: true },
    likes: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    snapshot_at: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export default mongoose.model('SocialMetricsHistory', socialMetricsHistorySchema);


