import request from 'supertest';
import { createApp } from '../src/app';
import {
  authHeader,
  cleanupTestData,
  connectDb,
  createTestMovie,
  disconnectDb,
  registerAdmin,
  registerUser,
  state,
} from './helpers';

const app = createApp();

beforeAll(async () => {
  await connectDb();
  await registerAdmin(app);
  await registerUser(app);
  state.movieId = await createTestMovie(app);
});

afterAll(async () => {
  await cleanupTestData();
  await disconnectDb();
});

describe('Messages API', () => {
  it('rejects message list without auth', async () => {
    const res = await request(app).get('/api/messages');
    expect(res.status).toBe(401);
  });

  it('sends message to admin', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set(authHeader(state.userToken))
      .send({ content: 'Interested in this film!', movieId: state.movieId });
    expect(res.status).toBe(201);
    expect(res.body.from).toBeDefined();
    expect(res.body.movieId).toBe(state.movieId);
    state.messageId = res.body.id;
  });

  it('rejects empty message', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set(authHeader(state.userToken))
      .send({ content: '' });
    expect(res.status).toBe(400);
  });

  it('user can view own messages', async () => {
    const res = await request(app)
      .get('/api/messages')
      .set(authHeader(state.userToken));
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body.every((m: { from: string }) => typeof m.from === 'string')).toBe(true);
  });

  it('admin can view all messages', async () => {
    const res = await request(app)
      .get('/api/messages')
      .set(authHeader(state.adminToken));
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('admin can reply to message', async () => {
    const res = await request(app)
      .post(`/api/messages/${state.messageId}/reply`)
      .set(authHeader(state.adminToken))
      .send({ content: 'Thank you for your interest!' });
    expect(res.status).toBe(201);
    expect(res.body.content).toContain('Thank you');
  });

  it('non-admin cannot reply', async () => {
    const res = await request(app)
      .post(`/api/messages/${state.messageId}/reply`)
      .set(authHeader(state.userToken))
      .send({ content: 'Unauthorized reply' });
    expect(res.status).toBe(403);
  });

  it('returns 404 when replying to unknown message', async () => {
    const res = await request(app)
      .post('/api/messages/00000000-0000-0000-0000-000000000000/reply')
      .set(authHeader(state.adminToken))
      .send({ content: 'Reply to nothing' });
    expect(res.status).toBe(404);
  });

  it('admin can delete message', async () => {
    const res = await request(app)
      .delete(`/api/messages/${state.messageId}`)
      .set(authHeader(state.adminToken));
    expect(res.status).toBe(204);
  });

  it('returns 404 when deleting unknown message', async () => {
    const res = await request(app)
      .delete('/api/messages/00000000-0000-0000-0000-000000000000')
      .set(authHeader(state.adminToken));
    expect(res.status).toBe(404);
  });
});
