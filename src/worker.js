import { startDashboardWorker, initQueue } from './utils/queue.js';
import { computeDashboard } from './utils/dashboardJob.js';
import { connectToDatabase } from './config/database.js';

async function main() {
  await connectToDatabase();
  initQueue('dashboard');
  startDashboardWorker(async (job) => {
    const { workspaceId, userId } = job.data || {};
    if (!workspaceId || !userId) return;
    await computeDashboard({ workspaceId, userId });
  });
  console.log('Worker started.');
}

main().catch((e) => {
  console.error('Worker failed to start', e);
  process.exit(1);
});


