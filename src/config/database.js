import mongoose from 'mongoose';
import { config } from './env.js';

export async function connectToDatabase() {
  const url = config.databaseUrl;
  if (!url) throw new Error('DATABASE_URL is not set');

  mongoose.set('strictQuery', true);

  const maxAttempts = 5;
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      await mongoose.connect(url, {
        autoIndex: config.nodeEnv !== 'production',
        serverSelectionTimeoutMS: 10000,
        dbName: config.databaseName || undefined,
      });
      break;
    } catch (err) {
      attempt += 1;
      console.error(`MongoDB connect attempt ${attempt} failed:`, err?.message || err);
      if (attempt >= maxAttempts) {
        console.error('Hint: If using MongoDB Atlas, ensure your IP is whitelisted and the connection string is correct.');
        throw err;
      }
      await delay(1000 * attempt);
    }
  }

  mongoose.connection.on('connected', () => {
    console.log('MongoDB connected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });
}


