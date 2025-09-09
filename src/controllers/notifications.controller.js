import Notification from '../models/Notification.js';

export async function list(req, res, next) {
  try {
    const items = await Notification.find({ workspace_id: req.workspaceId, user_id: req.user.id }).sort({ created_at: -1 }).lean();
    res.json({ success: true, data: items });
  } catch (e) { next(e); }
}

export async function markRead(req, res, next) {
  try {
    const { id } = req.params;
    await Notification.updateOne({ _id: id, user_id: req.user.id }, { $set: { read_at: new Date() } });
    res.json({ success: true, data: { id } });
  } catch (e) { next(e); }
}


