import IntegrationSettings from '../models/IntegrationSettings.js';
import Activity from '../models/Activity.js';
import { generateIcsFeed } from '../utils/integrations.js';
import { getGoogleAuthUrl, exchangeCodeAndSaveTokens } from '../utils/google.js';

export async function getSettings(req, res, next) {
  try {
    const s = await IntegrationSettings.findOne({ user_id: req.user.id, workspace_id: req.workspaceId }).lean();
    res.json({ success: true, data: s || {} });
  } catch (e) { next(e); }
}

export async function updateSettings(req, res, next) {
  try {
    const update = {
      slackWebhookUrl: req.body.slackWebhookUrl,
      emailFrom: req.body.emailFrom,
      reportEmail: req.body.reportEmail,
      calendarEnabled: req.body.calendarEnabled,
    };
    const s = await IntegrationSettings.findOneAndUpdate(
      { user_id: req.user.id, workspace_id: req.workspaceId },
      { $set: update, user_id: req.user.id, workspace_id: req.workspaceId },
      { upsert: true, new: true },
    );
    res.json({ success: true, data: s });
  } catch (e) { next(e); }
}

export async function ics(req, res, next) {
  try {
    const activities = await Activity.find({ user_id: req.user.id, workspace_id: req.workspaceId }).lean();
    const ics = await generateIcsFeed(activities);
    res.header('Content-Type', 'text/calendar');
    res.attachment('activities.ics');
    res.send(ics);
  } catch (e) { next(e); }
}

export async function googleAuthUrl(req, res, next) {
  try {
    const url = getGoogleAuthUrl();
    if (!url) return res.status(400).json({ success: false, error: 'not_configured', message: 'Google OAuth not configured' });
    res.json({ success: true, data: { url } });
  } catch (e) { next(e); }
}

export async function googleCallback(req, res, next) {
  try {
    const { code } = req.body;
    await exchangeCodeAndSaveTokens({ code, userId: req.user.id, workspaceId: req.workspaceId });
    res.json({ success: true, message: 'Google connected' });
  } catch (e) { next(e); }
}


