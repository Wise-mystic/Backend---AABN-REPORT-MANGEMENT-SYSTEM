import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    activity_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true, index: true },
    author_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export default mongoose.model('Comment', commentSchema);


