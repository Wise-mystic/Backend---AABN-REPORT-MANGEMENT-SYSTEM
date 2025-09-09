import Activity from '../models/Activity.js';
import { redisSet } from './redis.js';

export async function computeDashboard({ workspaceId, userId }) {
  // Precompute simple aggregates
  const total = await Activity.countDocuments({ workspace_id: workspaceId, user_id: userId });
  const byCategory = await Activity.aggregate([
    { $match: { workspace_id: activityObjectId(workspaceId), user_id: activityObjectId(userId) } },
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]);
  const data = { total, byCategory };
  await redisSet(`dashboard:${workspaceId}:${userId}`, data, 60);
  return data;
}

function activityObjectId(id) {
  // Lazy import to avoid circular
  const mongoose = require('mongoose');
  return new mongoose.Types.ObjectId(id);
}


