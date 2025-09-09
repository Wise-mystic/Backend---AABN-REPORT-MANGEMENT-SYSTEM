import request from 'supertest';
import app from '../src/app.js';

describe('health', () => {
  it('GET /health should return ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
  });
});


