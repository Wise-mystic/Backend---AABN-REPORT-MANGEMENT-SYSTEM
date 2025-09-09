import mongoose from 'mongoose';
import SocialMetricsHistory from '../models/SocialMetricsHistory.js';
import { getCache, setCache } from '../utils/cache.js';
import { redisGet, redisSet } from '../utils/redis.js';
import Activity from '../models/Activity.js';

export async function series(req, res, next) {
  try {
    const { activity_id, startDate, endDate } = req.query;
    const query = { user_id: new mongoose.Types.ObjectId(req.user.id) };
    if (activity_id) query.activity_id = new mongoose.Types.ObjectId(activity_id);
    if (startDate || endDate) {
      query.snapshot_at = {};
      if (startDate) query.snapshot_at.$gte = new Date(startDate);
      if (endDate) query.snapshot_at.$lte = new Date(endDate);
    }
    // workspace scoping happens via activity relation; optional
    const cacheKey = `series:${JSON.stringify(query)}`;
    const cachedMem = getCache(cacheKey);
    if (cachedMem) return res.json({ success: true, data: cachedMem });
    const cachedRedis = await redisGet(cacheKey);
    if (cachedRedis) return res.json({ success: true, data: cachedRedis });
    const items = await SocialMetricsHistory.find(query).sort({ snapshot_at: 1 }).lean();
    setCache(cacheKey, items, 30000);
    await redisSet(cacheKey, items, 30);
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
}

export async function dashboard(req, res, next) {
  try {
    const workspaceId = req.workspaceId;
    const userId = req.user.id;
    const { startDate, endDate } = req.query;
    const cacheKey = `dashboard:${workspaceId}:${userId}:${startDate || ''}:${endDate || ''}`;
    const cached = await redisGet(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const match = { workspace_id: new mongoose.Types.ObjectId(workspaceId), user_id: new mongoose.Types.ObjectId(userId) };
    if (startDate || endDate) {
      match.timestamp = {};
      if (startDate) match.timestamp.$gte = new Date(startDate);
      if (endDate) match.timestamp.$lte = new Date(endDate);
    }
    const [total, byCat] = await Promise.all([
      Activity.countDocuments(match),
      Activity.aggregate([
        { $match: match },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ])
    ]);
    const byCategory = byCat.reduce((acc, c) => { acc[c._id] = c.count; return acc; }, {});
    const data = { total, byCategory };
    await redisSet(cacheKey, data, 30);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}


