import request from 'supertest';
import { createApp } from '../src/app';
import {
  adminEmail,
  authHeader,
  cleanupTestData,
  connectDb,
  disconnectDb,
  password,
  registerAdmin,
  registerUser,
  state,
  userEmail,
} from './helpers';

const app = createApp();

beforeAll(async () => {
  await connectDb();
});

afterAll(async () => {
  await cleanupTestData();
  await disconnectDb();
});

describe('Auth API', () => {
  it('rejects registration with invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'testpass123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('rejects registration with short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'short@test.com', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('registers admin user', async () => {
    await registerAdmin(app);
    expect(state.adminToken).toBeTruthy();
  });

  it('registers regular user', async () => {
    await registerUser(app);
    expect(state.userToken).toBeTruthy();
  });

  it('rejects duplicate registration', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: userEmail, password });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('exists');
  });

  it('rejects login with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: userEmail, password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('rejects login with invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bad-email', password });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('logs in successfully and returns JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: userEmail, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(userEmail);
    expect(res.headers['content-type']).toMatch(/json/);
    state.userToken = res.body.token;
  });

  it('returns current user with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set(authHeader(state.userToken));
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(userEmail);
    expect(res.body.role).toBe('USER');
  });

  it('rejects /auth/me without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Access token required');
  });

  it('rejects /auth/me with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid or expired token');
  });
});
