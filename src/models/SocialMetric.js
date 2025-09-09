import mongoose from 'mongoose';

const socialMetricSchema = new mongoose.Schema(
  {
    activity_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true, index: true },
    likes: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
  },
  { timestamps: { updatedAt: 'updated_at', createdAt: false } }
);

export default mongoose.model('SocialMetric', socialMetricSchema);


