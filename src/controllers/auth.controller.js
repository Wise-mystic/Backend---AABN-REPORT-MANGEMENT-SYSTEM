import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { signJwtForUser } from '../middlewares/jwt.js';
import crypto from 'crypto';
import dayjs from 'dayjs';
import VerificationToken from '../models/VerificationToken.js';
import PasswordResetToken from '../models/PasswordResetToken.js';
import RefreshToken from '../models/RefreshToken.js';
import { config } from '../config/env.js';
import Workspace from '../models/Workspace.js';
import Membership from '../models/Membership.js';
import { sendGmail } from '../utils/google.js';
import { sendEmail } from '../utils/integrations.js';

export async function register(req, res, next) {
  try {
    const { email, password, name, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ success: false, error: 'conflict', message: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, password_hash, name, role });
    const token = signJwtForUser(user);
    setAuthCookie(res, token);
    // create verification token (mock email by returning in dev)
    const v = await createVerificationToken(user.id);
    // create default workspace and membership
    const ws = await Workspace.create({ name: `${user.name}'s Workspace`, owner_id: user.id });
    await Membership.create({ workspace_id: ws.id, user_id: user.id, role: 'admin', is_default: true });
    res.status(201).json({ success: true, data: { user: sanitizeUser(user), access_token: token, verify_token: isDev() ? v.token : undefined }, message: 'Registered' });
  } catch (err) { next(err); }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, error: 'unauthorized', message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ success: false, error: 'unauthorized', message: 'Invalid credentials' });

    const token = signJwtForUser(user);
    setAuthCookie(res, token);
    await issueRefreshCookie(res, user, req);
    res.json({ success: true, data: { user: sanitizeUser(user), access_token: token }, message: 'Logged in' });
  } catch (err) { next(err); }
}

export async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: 'not_found', message: 'User not found' });
    res.json({ success: true, data: { user: sanitizeUser(user) } });
  } catch (err) { next(err); }
}

function sanitizeUser(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, created_at: user.created_at, updated_at: user.updated_at };
}

function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProd,
    // In production (cross-site frontend/backend), allow third-party cookie
    // so the browser will include it with fetch credentials.
    sameSite: isProd ? 'none' : 'lax',
    ...(isProd ? { partitioned: true } : {}),
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export async function logout(req, res, next) {
  try {
    const isProd = process.env.NODE_ENV === 'production';
    // revoke refresh if present
    const refresh = req.cookies?.refresh;
    if (refresh) {
      await RefreshToken.findOneAndUpdate({ jti: refresh }, { revoked_at: new Date() });
    }
    res.clearCookie('token', { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax', path: '/' });
    res.clearCookie('refresh', { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax', path: '/' });
    res.json({ success: true, message: 'Logged out' });
  } catch (err) { next(err); }
}

// Email verification
export async function sendVerification(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: 'not_found', message: 'User not found' });
    const v = await createVerificationToken(user.id);
    res.json({ success: true, data: { verify_token: isDev() ? v.token : undefined }, message: 'Verification sent' });
  } catch (err) { next(err); }
}

export async function verifyEmail(req, res, next) {
  try {
    const { token } = req.body;
    const row = await VerificationToken.findOne({ token });
    if (!row || row.used_at || dayjs(row.expires_at).isBefore(dayjs())) {
      return res.status(400).json({ success: false, error: 'invalid_token', message: 'Invalid or expired token' });
    }
    await User.findByIdAndUpdate(row.user_id, { verified_at: new Date() });
    row.used_at = new Date();
    await row.save();
    res.json({ success: true, message: 'Email verified' });
  } catch (err) { next(err); }
}

// Password reset
export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: true, message: 'If the email exists, a reset link was sent' });
    // Generate numeric OTP (6 digits) with 10 min expiry
    const t = await createOtpToken(user.id);
    // Send via SMTP (nodemailer); falls back to dev token response if SMTP not configured
    try {
      await sendEmail({
        to: user.email,
        subject: 'Password reset',
        html: `<p>Use this token to reset your password:</p><p><b>${t.token}</b></p>`,
      });
    } catch {}
    res.json({ success: true, data: { reset_token: isDev() ? t.token : undefined }, message: 'Reset link sent' });
  } catch (err) { next(err); }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, otp, password } = req.body;
    const supplied = token || otp;
    const row = await PasswordResetToken.findOne({ token: supplied });
    if (!row || row.used_at || dayjs(row.expires_at).isBefore(dayjs())) {
      return res.status(400).json({ success: false, error: 'invalid_token', message: 'Invalid or expired token' });
    }
    const password_hash = await bcrypt.hash(password, 12);
    await User.findByIdAndUpdate(row.user_id, { password_hash });
    row.used_at = new Date();
    await row.save();
    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) { next(err); }
}

export async function verifyResetOtp(req, res, next) {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, error: 'invalid_email', message: 'Invalid email' });
    const row = await PasswordResetToken.findOne({ user_id: user.id, token: otp });
    if (!row || row.used_at || dayjs(row.expires_at).isBefore(dayjs())) {
      return res.status(400).json({ success: false, error: 'invalid_token', message: 'Invalid or expired token' });
    }
    res.json({ success: true, message: 'OTP verified' });
  } catch (err) { next(err); }
}

// Refresh token rotation
export async function refresh(req, res, next) {
  try {
    const isProd = process.env.NODE_ENV === 'production';
    const jti = req.cookies?.refresh;
    if (!jti) return res.status(401).json({ success: false, error: 'unauthorized', message: 'Missing refresh' });
    const row = await RefreshToken.findOne({ jti });
    if (!row || row.revoked_at || dayjs(row.expires_at).isBefore(dayjs())) {
      return res.status(401).json({ success: false, error: 'unauthorized', message: 'Invalid refresh' });
    }
    const user = await User.findById(row.user_id);
    if (!user) return res.status(401).json({ success: false, error: 'unauthorized', message: 'Invalid user' });
    // rotate
    row.revoked_at = new Date();
    await row.save();
    await issueRefreshCookie(res, user, req);
    const access = signJwtForUser(user);
    setAuthCookie(res, access);
    res.json({ success: true, data: { user: sanitizeUser(user), access_token: access }, message: 'Refreshed' });
  } catch (err) { next(err); }
}

async function createVerificationToken(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  const expires_at = dayjs().add(24, 'hour').toDate();
  return VerificationToken.create({ user_id: userId, token, expires_at });
}

async function createPasswordResetToken(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  const expires_at = dayjs().add(2, 'hour').toDate();
  return PasswordResetToken.create({ user_id: userId, token, expires_at });
}

async function createOtpToken(userId) {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expires_at = dayjs().add(10, 'minute').toDate();
  return PasswordResetToken.create({ user_id: userId, token: otp, expires_at });
}

async function issueRefreshCookie(res, user, req) {
  const isProd = process.env.NODE_ENV === 'production';
  const jti = crypto.randomUUID();
  const expires_at = dayjs().add(7, 'day').toDate();
  await RefreshToken.create({ user_id: user.id, jti, expires_at, user_agent: req.headers['user-agent'], ip: req.ip });
  res.cookie('refresh', jti, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    ...(isProd ? { partitioned: true } : {}),
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function isDev() { return process.env.NODE_ENV !== 'production'; }


