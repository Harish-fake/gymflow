import { adminToken, trainerToken, memberToken, uuid } from './setup.js';
import request from 'supertest';
import app from '../src/app.js';

const adminAuth = { Authorization: `Bearer ${adminToken}` };
const trainerAuth = { Authorization: `Bearer ${trainerToken}` };
const memberAuth = { Authorization: `Bearer ${memberToken}` };

describe('GET /api/workouts', () => {
  it('returns list of workouts for authenticated user', async () => {
    const res = await request(app)
      .get('/api/workouts')
      .set(adminAuth);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('supports member_id filter', async () => {
    const res = await request(app)
      .get(`/api/workouts?member_id=${uuid(2)}`)
      .set(adminAuth);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/workouts');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/workouts/:id', () => {
  it('returns workout detail for valid id', async () => {
    const res = await request(app)
      .get(`/api/workouts/${uuid(70)}`)
      .set(adminAuth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
  });

  it('returns 404 for non-existent workout', async () => {
    const res = await request(app)
      .get(`/api/workouts/${uuid(999)}`)
      .set(adminAuth);
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('requires authentication', async () => {
    const res = await request(app).get(`/api/workouts/${uuid(70)}`);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/workouts', () => {
  it('creates a workout with valid data', async () => {
    const res = await request(app)
      .post('/api/workouts')
      .set(trainerAuth)
      .send({
        member_id: uuid(2),
        name: 'Push Day',
        exercises: [{ exercise_id: uuid(110), sets: 3, reps: 10 }],
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('name');
  });

  it('rejects workout creation without name', async () => {
    const res = await request(app)
      .post('/api/workouts')
      .set(trainerAuth)
      .send({ member_id: uuid(2), exercises: [] });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('rejects workout creation without member_id', async () => {
    const res = await request(app)
      .post('/api/workouts')
      .set(trainerAuth)
      .send({ name: 'Test', exercises: [] });
    expect(res.status).toBe(400);
  });

  it('rejects member creating workout with 403', async () => {
    const res = await request(app)
      .post('/api/workouts')
      .set(memberAuth)
      .send({ member_id: uuid(2), name: 'Test', exercises: [] });
    expect(res.status).toBe(403);
  });

  it('requires authentication', async () => {
    const res = await request(app)
      .post('/api/workouts')
      .send({ member_id: uuid(2), name: 'Test', exercises: [] });
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/workouts/:id', () => {
  it('updates a workout with valid data', async () => {
    const res = await request(app)
      .put(`/api/workouts/${uuid(70)}`)
      .set(adminAuth)
      .send({ name: 'Updated Workout' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
  });

  it('rejects member updating workout with 403', async () => {
    const res = await request(app)
      .put(`/api/workouts/${uuid(70)}`)
      .set(memberAuth)
      .send({ name: 'Hacked' });
    expect(res.status).toBe(403);
  });

  it('requires authentication', async () => {
    const res = await request(app)
      .put(`/api/workouts/${uuid(70)}`)
      .send({ name: 'Test' });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/workouts/:id', () => {
  it('deletes a workout', async () => {
    const res = await request(app)
      .delete(`/api/workouts/${uuid(70)}`)
      .set(adminAuth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('rejects member deleting workout with 403', async () => {
    const res = await request(app)
      .delete(`/api/workouts/${uuid(70)}`)
      .set(memberAuth);
    expect(res.status).toBe(403);
  });

  it('requires authentication', async () => {
    const res = await request(app).delete(`/api/workouts/${uuid(70)}`);
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/workouts/:id/complete', () => {
  it('marks workout as complete', async () => {
    const res = await request(app)
      .put(`/api/workouts/${uuid(70)}/complete`)
      .set(memberAuth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('workout');
  });

  it('rejects unauthenticated request', async () => {
    const res = await request(app)
      .put(`/api/workouts/${uuid(70)}/complete`);
    expect(res.status).toBe(401);
  });
});

describe('GET /api/workouts/exercises/list', () => {
  it('returns list of exercises', async () => {
    const res = await request(app)
      .get('/api/workouts/exercises/list')
      .set(adminAuth);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('supports gym_id filter', async () => {
    const res = await request(app)
      .get(`/api/workouts/exercises/list?gym_id=${uuid(10)}`)
      .set(adminAuth);
    expect(res.status).toBe(200);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/workouts/exercises/list');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/workouts/exercises', () => {
  it('creates a new exercise with valid data', async () => {
    const res = await request(app)
      .post('/api/workouts/exercises')
      .set(adminAuth)
      .send({ name: 'Squat', category: 'Legs' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('rejects exercise creation without name', async () => {
    const res = await request(app)
      .post('/api/workouts/exercises')
      .set(adminAuth)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('rejects member creating exercise with 403', async () => {
    const res = await request(app)
      .post('/api/workouts/exercises')
      .set(memberAuth)
      .send({ name: 'Squat' });
    expect(res.status).toBe(403);
  });

  it('requires authentication', async () => {
    const res = await request(app)
      .post('/api/workouts/exercises')
      .send({ name: 'Squat' });
    expect(res.status).toBe(401);
  });
});
