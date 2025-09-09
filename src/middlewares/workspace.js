import mongoose from 'mongoose';
import Membership from '../models/Membership.js';
import Workspace from '../models/Workspace.js';

export async function resolveWorkspace(req, res, next) {
  try {
    // Single-workspace mode: always use/create the user's default workspace
    let m = await Membership.findOne({ user_id: new mongoose.Types.ObjectId(req.user.id), is_default: true });
    if (!m) {
      // Auto-provision a single default workspace for the user
      const ws = await Workspace.create({ name: 'My Workspace', owner_id: req.user.id });
      m = await Membership.create({ workspace_id: ws.id, user_id: req.user.id, role: 'admin', is_default: true });
    }
    req.workspaceId = String(m.workspace_id);
    req.membership = { role: m.role, workspace_id: String(m.workspace_id), user_id: String(m.user_id) };
    next();
  } catch (e) {
    next(e);
  }
}

export function setWorkspaceFromParam(paramName = 'id') {
  return (req, res, next) => {
    if (req.params?.[paramName]) {
      req.workspaceId = req.params[paramName];
    }
    next();
  };
}


