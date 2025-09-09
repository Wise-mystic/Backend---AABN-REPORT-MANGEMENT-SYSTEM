import IntegrationSettings from '../models/IntegrationSettings.js';
import nodemailer from 'nodemailer';
import { createEvents } from 'ics';

export async function slackNotify({ workspaceId, userId, text }) {
  try {
    const s = await IntegrationSettings.findOne({ workspace_id: workspaceId, user_id: userId }).lean();
    if (!s?.slackWebhookUrl) return;
    await fetch(s.slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
  } catch {}
}

export async function sendEmail({ to, subject, html, from }) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return;
  const transport = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  await transport.sendMail({ from: from || process.env.EMAIL_FROM || user, to, subject, html });
}

export async function generateIcsFeed(activities) {
  const events = (activities || []).map((a) => {
    const dt = new Date(a.timestamp || a.created_at);
    return {
      title: a.title,
      description: a.description || '',
      start: [dt.getFullYear(), dt.getMonth() + 1, dt.getDate(), dt.getHours(), dt.getMinutes()],
      duration: { minutes: 30 },
    };
  });
  const { error, value } = createEvents(events);
  if (error) throw error;
  return value;
}


