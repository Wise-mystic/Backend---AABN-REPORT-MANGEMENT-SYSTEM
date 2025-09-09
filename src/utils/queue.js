import pkg from 'bullmq';
const { Queue, Worker, QueueScheduler } = pkg;
import { config } from '../config/env.js';
import { createClient } from 'redis';

let connection = null;
function getConnection() {
  if (!config.redisUrl) return null;
  if (!connection) {
    connection = new URL(config.redisUrl);
  }
  return connection;
}

export function getQueue(name = 'default') {
  const conn = getConnection();
  if (!conn) return null;
  return new Queue(name, { connection: { url: conn.toString() } });
}

export function initQueue(name = 'default') {
  const conn = getConnection();
  if (!conn) return null;
  // QueueScheduler to manage delayed/retried jobs
  // eslint-disable-next-line no-new
  new QueueScheduler(name, { connection: { url: conn.toString() } });
  return true;
}

export function startDashboardWorker(processor) {
  const conn = getConnection();
  if (!conn) return null;
  const worker = new Worker('dashboard', processor, { connection: { url: conn.toString() } });
  worker.on('failed', (job, err) => {
    console.error('Dashboard job failed', job?.id, err);
  });
  return worker;
}


