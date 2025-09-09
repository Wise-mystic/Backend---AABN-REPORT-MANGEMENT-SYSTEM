import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', index: true },
    category: { type: String, enum: ['social-media', 'physical', 'financial', 'challenges', 'office'], required: true },
    platform: { type: String },
    title: { type: String, required: true },
    description: { type: String },
    timestamp: { type: Date, required: true },
    status: { type: String, enum: ['todo', 'in-progress', 'done'], default: 'done', index: true },
    due_date: { type: Date },
    tags: { type: [String], default: [], index: true },
    assignee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    attachments: {
      type: [
        new mongoose.Schema(
          {
            name: String,
            url: String,
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    approval: {
      approved: { type: Boolean, default: false },
      approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      approved_at: { type: Date },
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('Activity', activitySchema);
// Indexes for common queries
activitySchema.index({ user_id: 1, workspace_id: 1, timestamp: -1 });
activitySchema.index({ workspace_id: 1, status: 1, timestamp: -1 });
activitySchema.index({ workspace_id: 1, category: 1, timestamp: -1 });


