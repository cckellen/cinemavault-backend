import path from 'path';
import request from 'supertest';
import { createApp } from '../src/app';
import {
  authHeader,
  cleanupTestData,
  connectDb,
  disconnectDb,
  registerAdmin,
  registerUser,
  state,
  userEmail,
} from './helpers';

const app = createApp();
const avatarFixture = path.join(__dirname, 'fixtures/avatar.png');

beforeAll(async () => {
  await connectDb();
  await registerAdmin(app);
  await registerUser(app);
});

afterAll(async () => {
  await cleanupTestData();
  await disconnectDb();
});

describe('Profile API', () => {
  it('rejects profile without auth', async () => {
    const res = await request(app).get('/api/profile');
    expect(res.status).toBe(401);
  });

  it('returns user profile', async () => {
    const res = await request(app)
      .get('/api/profile')
      .set(authHeader(state.userToken));
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(userEmail);
    expect(res.body.role).toBe('USER');
  });

  it('updates username', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set(authHeader(state.userToken))
      .send({ username: 'UpdatedUser' });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('UpdatedUser');
  });

  it('rejects username that is too short', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set(authHeader(state.userToken))
      .send({ username: 'A' });
    expect(res.status).toBe(400);
  });

  it('uploads avatar successfully', async () => {
    const res = await request(app)
      .post('/api/profile/avatar')
      .set(authHeader(state.userToken))
      .attach('avatar', avatarFixture);
    expect(res.status).toBe(200);
    expect(res.body.avatarUrl).toMatch(/^\/uploads\/avatars\//);
    expect(res.body.message).toBe('Avatar uploaded successfully');
  });

  it('rejects avatar upload without file', async () => {
    const res = await request(app)
      .post('/api/profile/avatar')
      .set(authHeader(state.userToken));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('No file uploaded');
  });

  it('rejects non-image avatar upload', async () => {
    const res = await request(app)
      .post('/api/profile/avatar')
      .set(authHeader(state.userToken))
      .attach('avatar', Buffer.from('not an image'), 'test.txt');
    expect(res.status).toBe(500);
  });
});
