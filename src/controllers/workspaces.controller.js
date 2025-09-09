import Workspace from '../models/Workspace.js';
import Membership from '../models/Membership.js';

export async function list(req, res, next) {
  try {
    const memberships = await Membership.find({ user_id: req.user.id }).lean();
    const ids = memberships.map(m => m.workspace_id);
    const workspaces = await Workspace.find({ _id: { $in: ids } }).lean();
    const roleByWs = Object.fromEntries(memberships.map(m => [String(m.workspace_id), m.role]));
    res.json({ success: true, data: workspaces.map(w => ({ id: w._id, name: w.name, role: roleByWs[String(w._id)] })) });
  } catch (e) { next(e); }
}

export async function create(req, res, next) {
  try {
    const ws = await Workspace.create({ name: req.body.name, owner_id: req.user.id });
    await Membership.create({ workspace_id: ws.id, user_id: req.user.id, role: 'admin', is_default: false });
    res.status(201).json({ success: true, data: { id: ws.id, name: ws.name } });
  } catch (e) { next(e); }
}

export async function addMember(req, res, next) {
  try {
    const { workspace_id, user_id, role } = req.body;
    const mem = await Membership.findOneAndUpdate({ workspace_id, user_id }, { role }, { upsert: true, new: true });
    res.json({ success: true, data: { id: mem.id } });
  } catch (e) { next(e); }
}

export async function listMembers(req, res, next) {
  try {
    const members = await Membership.find({ workspace_id: req.workspaceId }).populate('user_id', 'email name').lean();
    res.json({ success: true, data: members.map(m => ({ id: m._id, user: { id: m.user_id._id, email: m.user_id.email, name: m.user_id.name }, role: m.role })) });
  } catch (e) { next(e); }
}

export async function updateMember(req, res, next) {
  try {
    const { memberId } = req.params;
    const { role } = req.body;
    const m = await Membership.findOneAndUpdate({ _id: memberId, workspace_id: req.workspaceId }, { role }, { new: true }).lean();
    if (!m) return res.status(404).json({ success: false, error: 'not_found', message: 'Member not found' });
    res.json({ success: true, data: { id: m._id, role: m.role } });
  } catch (e) { next(e); }
}

export async function removeMember(req, res, next) {
  try {
    const { memberId } = req.params;
    await Membership.deleteOne({ _id: memberId, workspace_id: req.workspaceId });
    res.json({ success: true, data: { id: memberId } });
  } catch (e) { next(e); }
}


