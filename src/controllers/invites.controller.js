import crypto from 'crypto';
import dayjs from 'dayjs';
import Invite from '../models/Invite.js';
import User from '../models/User.js';
import Membership from '../models/Membership.js';
import { sendEmail } from '../utils/integrations.js';
import { signJwtForUser } from '../middlewares/jwt.js';

export async function list(req, res, next) {
  try {
    const rows = await Invite.find({ workspace_id: req.workspaceId }).sort({ created_at: -1 }).lean();
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
}

export async function create(req, res, next) {
  try {
    const { email, role = 'member' } = req.body;
    const token = crypto.randomBytes(24).toString('hex');
    const expires_at = dayjs().add(7, 'day').toDate();
    const invite = await Invite.create({ workspace_id: req.workspaceId, email, role, invited_by: req.user.id, token, expires_at });

    await sendInviteEmail({ email, token, workspaceId: req.workspaceId, role });

    const data = sanitize(invite);
    if (isDev()) {
      data.dev_token = token;
      data.accept_url = buildAcceptUrl(token);
    }
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}

export async function resend(req, res, next) {
  try {
    const { inviteId } = req.params;
    const row = await Invite.findOne({ _id: inviteId, workspace_id: req.workspaceId });
    if (!row || row.status !== 'pending') return res.status(404).json({ success: false, error: 'not_found', message: 'Invite not found' });
    await sendInviteEmail({ email: row.email, token: row.token, workspaceId: req.workspaceId, role: row.role });
    const data = isDev() ? { dev_token: row.token, accept_url: buildAcceptUrl(row.token) } : undefined;
    res.json({ success: true, message: 'Resent', ...(data ? { data } : {}) });
  } catch (e) { next(e); }
}

export async function revoke(req, res, next) {
  try {
    const { inviteId } = req.params;
    const row = await Invite.findOneAndUpdate({ _id: inviteId, workspace_id: req.workspaceId }, { status: 'revoked' }, { new: true });
    if (!row) return res.status(404).json({ success: false, error: 'not_found', message: 'Invite not found' });
    res.json({ success: true, data: sanitize(row) });
  } catch (e) { next(e); }
}

export async function accept(req, res, next) {
  try {
    const { token, name, password } = req.body;
    const row = await Invite.findOne({ token });
    if (!row || row.status !== 'pending' || dayjs(row.expires_at).isBefore(dayjs())) {
      return res.status(400).json({ success: false, error: 'invalid_token', message: 'Invalid or expired invite' });
    }

    // If user exists, attach; else create minimal user
    let user = await User.findOne({ email: row.email });
    if (!user) {
      const password_hash = password ? await (await import('bcryptjs')).default.hash(password, 12) : undefined;
      user = await User.create({ email: row.email, name: name || row.email.split('@')[0], password_hash });
    }
    await Membership.findOneAndUpdate({ workspace_id: row.workspace_id, user_id: user.id }, { role: row.role }, { upsert: true, new: true });

    row.status = 'accepted';
    row.accepted_by = user.id;
    row.accepted_at = new Date();
    await row.save();

    // Set auth cookies for convenience (if they just signed up)
    const jwt = signJwtForUser(user);
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('token', jwt, { httpOnly: true, secure: isProd, sameSite: isProd ? 'lax' : 'lax', maxAge: 24*60*60*1000, path: '/' });

    res.json({ success: true, message: 'Invite accepted' });
  } catch (e) { next(e); }
}

async function sendInviteEmail({ email, token, workspaceId, role }) {
  const url = buildAcceptUrl(token);
  await sendEmail({ to: email, subject: 'You are invited', html: `<p>You have been invited to join a workspace as <b>${role}</b>.</p><p>Accept here: <a href="${url}">${url}</a></p>` });
}

function sanitize(doc) {
  return { id: doc._id, email: doc.email, role: doc.role, status: doc.status, expires_at: doc.expires_at };
}

function isDev() { return process.env.NODE_ENV !== 'production'; }

function buildAcceptUrl(token) {
  return `${process.env.APP_URL || 'http://localhost:5173'}/accept-invite?token=${token}`;
}


