import cron from 'node-cron';
import IntegrationSettings from '../models/IntegrationSettings.js';
import Activity from '../models/Activity.js';
import { sendEmail } from './integrations.js';
import { slackNotify } from './integrations.js';

export function initScheduler() {
  // Every Monday at 08:00
  cron.schedule('0 8 * * 1', async () => {
    try {
      const settings = await IntegrationSettings.find({ reportEmail: { $exists: true, $ne: '' } }).lean();
      for (const s of settings) {
        const since = new Date();
        since.setDate(since.getDate() - 7);
        const count = await Activity.countDocuments({ workspace_id: s.workspace_id, timestamp: { $gte: since } });
        await sendEmail({ to: s.reportEmail, subject: 'Weekly Activity Report', html: `<p>Total activities last 7 days: <b>${count}</b></p>`, from: s.emailFrom });
      }
    } catch (e) {
      // ignore errors
    }
  });

  // Overdue reminders daily at 09:00
  cron.schedule('0 9 * * *', async () => {
    try {
      const now = new Date();
      const overdue = await Activity.find({ due_date: { $lt: now }, 'approval.approved': { $ne: true } }).lean();
      for (const a of overdue) {
        await slackNotify({ workspaceId: a.workspace_id, userId: a.user_id, text: `Overdue activity: ${a.title}` });
      }
    } catch {}
  });
}


