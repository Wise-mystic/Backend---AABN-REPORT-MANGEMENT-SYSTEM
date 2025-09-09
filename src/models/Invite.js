import mongoose from 'mongoose';

const inviteSchema = new mongoose.Schema(
  {
    workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    email: { type: String, required: true, index: true },
    role: { type: String, enum: ['admin', 'manager', 'member'], default: 'member' },
    invited_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true, index: true },
    expires_at: { type: Date, required: true, index: true },
    status: { type: String, enum: ['pending', 'accepted', 'revoked'], default: 'pending', index: true },
    accepted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    accepted_at: { type: Date },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Prevent multiple active invites for the same email within a workspace
inviteSchema.index(
  { workspace_id: 1, email: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

export default mongoose.model('Invite', inviteSchema);
// TTL on expires_at (cleanup). Note: requires MongoDB TTL monitor; will not delete immediately.
inviteSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });


