import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', index: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['activities', 'likes', 'shares', 'comments', 'reach'], required: true },
    target: { type: Number, required: true, min: 1 },
    period: { type: String, enum: ['weekly', 'monthly', 'quarterly'], default: 'monthly' },
    start_at: { type: Date },
    end_at: { type: Date },
    category: { type: String, enum: ['social-media', 'physical', 'financial', 'challenges', 'office', 'all'], default: 'all' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('Goal', goalSchema);


