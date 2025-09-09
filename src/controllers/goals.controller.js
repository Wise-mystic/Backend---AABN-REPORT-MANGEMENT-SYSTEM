import dayjs from 'dayjs';
import mongoose from 'mongoose';
import Goal from '../models/Goal.js';
import Activity from '../models/Activity.js';
import SocialMetricsHistory from '../models/SocialMetricsHistory.js';

export async function list(req, res, next) {
  try {
    const goals = await Goal.find({ user_id: req.user.id, workspace_id: req.workspaceId }).lean();
    res.json({ success: true, data: goals });
  } catch (e) { next(e); }
}

export async function create(req, res, next) {
  try {
    const now = dayjs();
    let start_at = now.toDate();
    let end_at = now.toDate();
    const period = req.body.period || 'monthly';
    if (period === 'weekly') {
      end_at = now.add(7, 'day').toDate();
    } else if (period === 'monthly') {
      end_at = now.add(1, 'month').toDate();
    } else if (period === 'quarterly') {
      end_at = now.add(3, 'month').toDate();
    }
    const doc = { ...req.body, start_at, end_at, user_id: req.user.id, workspace_id: req.workspaceId };
    const goal = await Goal.create(doc);
    res.status(201).json({ success: true, data: goal });
  } catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try {
    const { id } = req.params;
    await Goal.deleteOne({ _id: id, user_id: req.user.id, workspace_id: req.workspaceId });
    res.json({ success: true, data: { id } });
  } catch (e) { next(e); }
}

export async function progress(req, res, next) {
  try {
    const goals = await Goal.find({ user_id: req.user.id, workspace_id: req.workspaceId }).lean();
    const results = [];
    for (const g of goals) {
      const windowStart = dayjs(g.start_at || g.created_at);
      const windowEnd = dayjs(g.end_at || new Date());
      let current = 0;
      if (g.type === 'activities') {
        const q = { user_id: req.user.id, workspace_id: new mongoose.Types.ObjectId(req.workspaceId), timestamp: { $gte: windowStart.toDate(), $lte: windowEnd.toDate() } };
        if (g.category && g.category !== 'all') q.category = g.category;
        current = await Activity.countDocuments(q);
      } else {
        const match = { user_id: new mongoose.Types.ObjectId(req.user.id), snapshot_at: { $gte: windowStart.toDate(), $lte: windowEnd.toDate() } };
        const groupField = g.type;
        const agg = await SocialMetricsHistory.aggregate([
          { $match: match },
          { $group: { _id: null, sum: { $sum: `$${groupField}` } } }
        ]);
        current = agg[0]?.sum || 0;
      }
      results.push({ id: String(g._id), name: g.name, type: g.type, target: g.target, current, pct: Math.min(100, Math.round((current / g.target) * 100)) });
    }
    res.json({ success: true, data: results });
  } catch (e) { next(e); }
}


