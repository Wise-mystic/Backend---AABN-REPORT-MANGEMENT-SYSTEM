import mongoose from 'mongoose';

const membershipSchema = new mongoose.Schema(
  {
    workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['admin', 'manager', 'member'], default: 'admin' },
    is_default: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

membershipSchema.index({ workspace_id: 1, user_id: 1 }, { unique: true });

export default mongoose.model('Membership', membershipSchema);


