import { adminToken, trainerToken, memberToken, uuid } from './setup.js';
import request from 'supertest';
import app from '../src/app.js';

const adminAuth = { Authorization: `Bearer ${adminToken}` };
const trainerAuth = { Authorization: `Bearer ${trainerToken}` };
const memberAuth = { Authorization: `Bearer ${memberToken}` };
const gymQuery = `gym_id=${uuid(10)}`;

describe('GET /api/attendance', () => {
  it('returns list of attendance records for admin', async () => {
    const res = await request(app)
      .get('/api/attendance')
      .set(adminAuth);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('supports date filter', async () => {
    const res = await request(app)
      .get('/api/attendance?date=2026-01-01')
      .set(adminAuth);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('rejects non-admin access with 403', async () => {
    const res = await request(app)
      .get('/api/attendance')
      .set(memberAuth);
    expect(res.status).toBe(403);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/attendance');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/attendance/today', () => {
  it('returns today attendance summary', async () => {
    const res = await request(app)
      .get(`/api/attendance/today?${gymQuery}`)
      .set(adminAuth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('checked_in');
    expect(res.body).toHaveProperty('checked_out');
    expect(res.body).toHaveProperty('records');
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/attendance/today');
    expect(res.status).toBe(401);
  });

  it('rejects non-admin access with 403', async () => {
    const res = await request(app)
      .get('/api/attendance/today')
      .set(memberAuth);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/attendance/mine', () => {
  it('returns own attendance records for member', async () => {
    const res = await request(app)
      .get('/api/attendance/mine')
      .set(memberAuth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('records');
    expect(res.body).toHaveProperty('this_month_count');
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/attendance/mine');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/attendance/check-in', () => {
  it('checks in successfully with valid data', async () => {
    const res = await request(app)
      .post('/api/attendance/check-in')
      .set(adminAuth)
      .send({ gym_id: uuid(10), method: 'manual' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('record');
  });

  it('rejects check-in without gym_id', async () => {
    const res = await request(app)
      .post('/api/attendance/check-in')
      .set(adminAuth)
      .send({ method: 'manual' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('rejects check-in for member with expired membership', async () => {
    const res = await request(app)
      .post('/api/attendance/check-in')
      .set(memberAuth)
      .send({ gym_id: uuid(10), method: 'manual' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('requires authentication', async () => {
    const res = await request(app)
      .post('/api/attendance/check-in')
      .send({ gym_id: uuid(10) });
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/attendance/:id/check-out', () => {
  it('checks out successfully for own record', async () => {
    const res = await request(app)
      .put(`/api/attendance/${uuid(60)}/check-out`)
      .set(memberAuth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('record');
    expect(res.body).toHaveProperty('duration_minutes');
  });

  it('returns 404 for non-existent record', async () => {
    const res = await request(app)
      .put(`/api/attendance/${uuid(999)}/check-out`)
      .set(memberAuth);
    expect(res.status).toBe(404);
  });

  it('requires authentication', async () => {
    const res = await request(app)
      .put(`/api/attendance/${uuid(60)}/check-out`);
    expect(res.status).toBe(401);
  });
});

describe('GET /api/attendance/report', () => {
  it('returns attendance report with date range', async () => {
    const res = await request(app)
      .get(`/api/attendance/report?${gymQuery}&from=2026-01-01&to=2026-12-31`)
      .set(adminAuth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total_records');
    expect(res.body).toHaveProperty('unique_members');
    expect(res.body).toHaveProperty('daily_breakdown');
    expect(res.body).toHaveProperty('records');
  });

  it('rejects report without date range', async () => {
    const res = await request(app)
      .get('/api/attendance/report')
      .set(adminAuth);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('rejects non-admin access with 403', async () => {
    const res = await request(app)
      .get('/api/attendance/report')
      .set(memberAuth);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/attendance/qr', () => {
  it('generates QR code', async () => {
    const res = await request(app)
      .get(`/api/attendance/qr?${gymQuery}`)
      .set(adminAuth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('qr_code');
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('date');
    expect(res.body).toHaveProperty('time_slot');
  });

  it('rejects non-admin access with 403', async () => {
    const res = await request(app)
      .get('/api/attendance/qr')
      .set(memberAuth);
    expect(res.status).toBe(403);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/attendance/qr');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/attendance/calendar', () => {
  it('returns calendar for authenticated user', async () => {
    const res = await request(app)
      .get('/api/attendance/calendar?month=1&year=2026')
      .set(memberAuth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('year');
    expect(res.body).toHaveProperty('month');
    expect(res.body).toHaveProperty('dates');
    expect(res.body).toHaveProperty('total');
    expect(Array.isArray(res.body.dates)).toBe(true);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/attendance/calendar');
    expect(res.status).toBe(401);
  });
});
