import './config/env.js';
import app from './app.js';
import { connectToDatabase } from './config/database.js';
import { initScheduler } from './utils/scheduler.js';
import { initQueue } from './utils/queue.js';

const port = process.env.PORT || 3001;

async function start() {
  await connectToDatabase();
  app.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });
  initScheduler();
  initQueue('dashboard');
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});


