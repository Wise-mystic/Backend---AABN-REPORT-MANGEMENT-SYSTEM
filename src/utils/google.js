import { google } from 'googleapis';
import IntegrationSettings from '../models/IntegrationSettings.js';

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return null;
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getGoogleAuthUrl(scopes = ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/gmail.send']) {
  const oauth2Client = getOAuthClient();
  if (!oauth2Client) return null;
  return oauth2Client.generateAuthUrl({ access_type: 'offline', scope: scopes });
}

export async function exchangeCodeAndSaveTokens({ code, userId, workspaceId }) {
  const oauth2Client = getOAuthClient();
  if (!oauth2Client) throw new Error('Google OAuth not configured');
  const { tokens } = await oauth2Client.getToken(code);
  await IntegrationSettings.findOneAndUpdate(
    { user_id: userId, workspace_id: workspaceId },
    { $set: { google: { access_token: tokens.access_token, refresh_token: tokens.refresh_token, expiry_date: tokens.expiry_date } } },
    { upsert: true }
  );
}

export async function createCalendarEvent({ userId, workspaceId, activity }) {
  const oauth2Client = getOAuthClient();
  if (!oauth2Client) return;
  const settings = await IntegrationSettings.findOne({ user_id: userId, workspace_id: workspaceId }).lean();
  if (!settings?.google?.access_token) return;
  oauth2Client.setCredentials({
    access_token: settings.google.access_token,
    refresh_token: settings.google.refresh_token,
    expiry_date: settings.google.expiry_date,
  });
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const start = new Date(activity.timestamp || Date.now());
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: activity.title,
      description: activity.description || '',
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    },
  });
}

export async function sendGmail({ userId, workspaceId, to, subject, html, text }) {
  const oauth2Client = getOAuthClient();
  if (!oauth2Client) return false;
  const settings = await IntegrationSettings.findOne({ user_id: userId, workspace_id: workspaceId }).lean();
  if (!settings?.google?.access_token) return false;

  oauth2Client.setCredentials({
    access_token: settings.google.access_token,
    refresh_token: settings.google.refresh_token,
    expiry_date: settings.google.expiry_date,
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const from = settings?.emailFrom || 'me';

  const boundary = 'mixed-' + Date.now();
  const body = [
    'MIME-Version: 1.0',
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: multipart/alternative; boundary=${boundary}`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    text || '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    html || '',
    `--${boundary}--`,
    '',
  ].join('\r\n');

  const encoded = Buffer.from(body).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  await gmail.users.messages.send({ userId: 'me', requestBody: { raw: encoded } });
  return true;
}


