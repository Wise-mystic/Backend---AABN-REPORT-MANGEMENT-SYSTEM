import { createClient } from 'redis';
import { config } from '../config/env.js';

let client = null;
export async function getRedis() {
  if (!config.redisUrl) return null;
  if (client) return client;
  client = createClient({ url: config.redisUrl });
  client.on('error', (err) => console.error('Redis error', err));
  await client.connect();
  return client;
}

export async function redisGet(key) {
  const r = await getRedis();
  if (!r) return null;
  const val = await r.get(key);
  return val ? JSON.parse(val) : null;
}

export async function redisSet(key, value, ttlSec = 30) {
  const r = await getRedis();
  if (!r) return;
  await r.set(key, JSON.stringify(value), { EX: ttlSec });
}


