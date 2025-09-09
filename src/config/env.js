import dotenv from 'dotenv';

dotenv.config();

export const config = {
  databaseUrl: process.env.DATABASE_URL,
  databaseName: process.env.DATABASE_NAME,
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  refreshSecret: process.env.REFRESH_JWT_SECRET || process.env.JWT_SECRET || 'change-me-refresh',
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3001),
  redisUrl: process.env.REDIS_URL,
};


