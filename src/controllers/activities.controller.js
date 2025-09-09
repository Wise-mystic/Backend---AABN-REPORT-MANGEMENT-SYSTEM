import dayjs from 'dayjs';
import { Parser } from 'json2csv';
import mongoose from 'mongoose';
import Activity from '../models/Activity.js';
import SocialMetric from '../models/SocialMetric.js';
import SocialMetricsHistory from '../models/SocialMetricsHistory.js';
import Comment from '../models/Comment.js';
import { slackNotify } from '../utils/integrations.js';
import { createCalendarEvent } from '../utils/google.js';
import Notification from '../models/Notification.js';

export async function list(req, res, next) {
  try {
    const { category, platform, startDate, endDate, status, assignee_id, tag, page = 1, limit = 20 } = req.query;
    const query = { user_id: req.user.id };
    if (req.workspaceId) query.workspace_id = new mongoose.Types.ObjectId(req.workspaceId);
    if (category) query.category = category;
    if (platform) query.platform = platform;
    if (status) query.status = status;
    if (assignee_id) query.assignee_id = new mongoose.Types.ObjectId(assignee_id);
    if (tag) query.tags = tag;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Activity.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('user_id', 'name email')
        .lean(),
      Activity.countDocuments(query),
    ]);

    res.json({ success: true, data: { items, total, page: Number(page), limit: Number(limit) } });
  } catch (err) { next(err); }
}

export async function create(req, res, next) {
  try {
    const body = { ...req.body, user_id: req.user.id, workspace_id: req.workspaceId };
    const activity = await Activity.create(body);
    // fire-and-forget slack notification
    slackNotify({ workspaceId: req.workspaceId, userId: req.user.id, text: `New activity: ${activity.title}` });
    // try create Google Calendar event
    createCalendarEvent({ userId: req.user.id, workspaceId: req.workspaceId, activity });
    res.status(201).json({ success: true, data: activity, message: 'Activity created' });
  } catch (err) { next(err); }
}

export async function update(req, res, next) {
  try {
    const { id } = req.params;
    const activity = await Activity.findOneAndUpdate({ _id: id, user_id: req.user.id }, req.body, { new: true }).lean();
    if (!activity) return res.status(404).json({ success: false, error: 'not_found', message: 'Activity not found' });
    res.json({ success: true, data: activity, message: 'Activity updated' });
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const activity = await Activity.findOneAndDelete({ _id: id, user_id: req.user.id });
    if (!activity) return res.status(404).json({ success: false, error: 'not_found', message: 'Activity not found' });
    await SocialMetric.deleteMany({ activity_id: id });
    res.json({ success: true, data: { id }, message: 'Activity deleted' });
  } catch (err) { next(err); }
}

export async function updateMetrics(req, res, next) {
  try {
    const { id } = req.params;
    const activity = await Activity.findOne({ _id: id, user_id: req.user.id });
    if (!activity) return res.status(404).json({ success: false, error: 'not_found', message: 'Activity not found' });

    const metric = await SocialMetric.findOneAndUpdate(
      { activity_id: id },
      { $set: req.body },
      { new: true, upsert: true }
    );
    // append history snapshot
    await SocialMetricsHistory.create({
      user_id: req.user.id,
      activity_id: id,
      likes: metric.likes ?? 0,
      shares: metric.shares ?? 0,
      comments: metric.comments ?? 0,
      reach: metric.reach ?? 0,
      snapshot_at: new Date(),
    });
    res.json({ success: true, data: metric, message: 'Metrics updated' });
  } catch (err) { next(err); }
}

export async function assign(req, res, next) {
  try {
    const { id } = req.params;
    const { assignee_id } = req.body || {};
    const targetAssignee = assignee_id || req.user.id;
    const activity = await Activity.findOneAndUpdate({ _id: id, workspace_id: req.workspaceId }, { assignee_id: targetAssignee }, { new: true }).lean();
    if (!activity) return res.status(404).json({ success: false, error: 'not_found', message: 'Activity not found' });
    await Notification.create({ workspace_id: req.workspaceId, user_id: targetAssignee, type: 'assigned', data: { activity_id: id, title: activity.title } });
    res.json({ success: true, data: activity, message: 'Assigned' });
  } catch (e) { next(e); }
}

export async function approve(req, res, next) {
  try {
    const { id } = req.params;
    const activity = await Activity.findOneAndUpdate({ _id: id, workspace_id: req.workspaceId }, { approval: { approved: true, approved_by: req.user.id, approved_at: new Date() } }, { new: true }).lean();
    if (!activity) return res.status(404).json({ success: false, error: 'not_found', message: 'Activity not found' });
    if (activity.assignee_id) {
      await Notification.create({ workspace_id: req.workspaceId, user_id: activity.assignee_id, type: 'approved', data: { activity_id: id, title: activity.title } });
    }
    res.json({ success: true, data: activity, message: 'Approved' });
  } catch (e) { next(e); }
}

export async function stats(req, res, next) {
  try {
    const userId = req.user.id;
    const now = dayjs();
    const startOfMonth = now.startOf('month').toDate();
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const [counts, monthly] = await Promise.all([
      Activity.aggregate([
        { $match: { user_id: userObjectId } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      Activity.countDocuments({ user_id: userObjectId, timestamp: { $gte: startOfMonth } }),
    ]);

    const byCategory = counts.reduce((acc, c) => { acc[c._id] = c.count; return acc; }, {});
    res.json({ success: true, data: { byCategory, thisMonth: monthly } });
  } catch (err) { next(err); }
}

export async function exportData(req, res, next) {
  try {
    const userId = req.user.id;
    const activities = await Activity.find({ user_id: userId }).lean();
    const metrics = await SocialMetric.find({ activity_id: { $in: activities.map(a => a._id) } }).lean();
    const withMetrics = activities.map(a => ({
      ...a,
      metrics: metrics.find(m => String(m.activity_id) === String(a._id)) || null,
    }));

    const format = (req.query.format || 'json').toLowerCase();
    if (format === 'csv') {
      const parser = new Parser({ flatten: true });
      const csv = parser.parse(withMetrics);
      res.header('Content-Type', 'text/csv');
      res.attachment('activities.csv');
      return res.send(csv);
    }

    res.json({ success: true, data: withMetrics });
  } catch (err) { next(err); }
}

// Comments
export async function listComments(req, res, next) {
  try {
    const { id } = req.params;
    const activity = await Activity.findOne({ _id: id, user_id: req.user.id });
    if (!activity) return res.status(404).json({ success: false, error: 'not_found', message: 'Activity not found' });
    const comments = await Comment.find({ activity_id: id }).sort({ created_at: 1 }).lean();
    res.json({ success: true, data: comments });
  } catch (err) { next(err); }
}

export async function createComment(req, res, next) {
  try {
    const { id } = req.params;
    const activity = await Activity.findOne({ _id: id, user_id: req.user.id });
    if (!activity) return res.status(404).json({ success: false, error: 'not_found', message: 'Activity not found' });
    const comment = await Comment.create({ activity_id: id, author_id: req.user.id, body: req.body.body });
    res.status(201).json({ success: true, data: comment });
  } catch (err) { next(err); }
}

export async function deleteComment(req, res, next) {
  try {
    const { id, commentId } = req.params;
    const activity = await Activity.findOne({ _id: id, user_id: req.user.id });
    if (!activity) return res.status(404).json({ success: false, error: 'not_found', message: 'Activity not found' });
    const comment = await Comment.findOneAndDelete({ _id: commentId, activity_id: id, author_id: req.user.id });
    if (!comment) return res.status(404).json({ success: false, error: 'not_found', message: 'Comment not found' });
    res.json({ success: true, data: { id: commentId } });
  } catch (err) { next(err); }
}


