import { adminToken, trainerToken, memberToken, uuid } from './setup.js';
import request from 'supertest';
import app from '../src/app.js';

const adminAuth = { Authorization: `Bearer ${adminToken}` };
const trainerAuth = { Authorization: `Bearer ${trainerToken}` };
const memberAuth = { Authorization: `Bearer ${memberToken}` };
const gymQuery = `gym_id=${uuid(10)}`;

describe('GET /api/reports/revenue', () => {
  it('returns revenue report for admin', async () => {
    const res = await request(app)
      .get(`/api/reports/revenue?${gymQuery}`)
      .set(adminAuth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total_revenue');
    expect(res.body).toHaveProperty('transaction_count');
    expect(res.body).toHaveProperty('monthly_breakdown');
    expect(res.body).toHaveProperty('plan_breakdown');
  });

  it('supports date range filter', async () => {
    const res = await request(app)
      .get(`/api/reports/revenue?${gymQuery}&from=2026-01-01&to=2026-12-31`)
      .set(adminAuth);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/reports/attendance', () => {
  it('returns attendance report for admin', async () => {
    const res = await request(app)
      .get(`/api/reports/attendance?${gymQuery}`)
      .set(adminAuth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total_records');
    expect(res.body).toHaveProperty('unique_members');
    expect(res.body).toHaveProperty('avg_duration_minutes');
    expect(res.body).toHaveProperty('daily_breakdown');
  });

  it('supports date range filter', async () => {
    const res = await request(app)
      .get(`/api/reports/attendance?${gymQuery}&from=2026-01-01&to=2026-12-31`)
      .set(adminAuth);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/reports/membership', () => {
  it('returns membership report for admin', async () => {
    const res = await request(app)
      .get(`/api/reports/membership?${gymQuery}`)
      .set(adminAuth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('by_status');
    expect(res.body).toHaveProperty('by_plan');
  });
});

describe('GET /api/reports/member-growth', () => {
  it('returns member growth report for admin', async () => {
    const res = await request(app)
      .get(`/api/reports/member-growth?${gymQuery}`)
      .set(adminAuth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('monthly_growth');
    expect(Array.isArray(res.body.monthly_growth)).toBe(true);
  });

  it('accepts months parameter', async () => {
    const res = await request(app)
      .get(`/api/reports/member-growth?${gymQuery}&months=6`)
      .set(adminAuth);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/reports/trainer-performance', () => {
  it('returns trainer performance report for admin', async () => {
    const res = await request(app)
      .get(`/api/reports/trainer-performance?${gymQuery}`)
      .set(adminAuth);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /api/reports/export/:type', () => {
  it('exports revenue report as JSON', async () => {
    const res = await request(app)
      .get(`/api/reports/export/revenue?${gymQuery}`)
      .set(adminAuth);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('exports members report as JSON', async () => {
    const res = await request(app)
      .get(`/api/reports/export/members?${gymQuery}`)
      .set(adminAuth);
    expect(res.status).toBe(200);
  });

  it('exports attendance report as JSON', async () => {
    const res = await request(app)
      .get(`/api/reports/export/attendance?${gymQuery}`)
      .set(adminAuth);
    expect(res.status).toBe(200);
  });

  it('rejects invalid export type', async () => {
    const res = await request(app)
      .get('/api/reports/export/invalid')
      .set(adminAuth);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

describe('Access Control', () => {
  it('denies reports for members with 403', async () => {
    const res = await request(app)
      .get(`/api/reports/revenue?${gymQuery}`)
      .set(memberAuth);
    expect(res.status).toBe(403);
  });

  it('denies reports for trainers with 403', async () => {
    const res = await request(app)
      .get(`/api/reports/revenue?${gymQuery}`)
      .set(trainerAuth);
    expect(res.status).toBe(403);
  });

  it('requires authentication for all report routes', async () => {
    const res = await request(app)
      .get(`/api/reports/revenue?${gymQuery}`);
    expect(res.status).toBe(401);
  });
});
