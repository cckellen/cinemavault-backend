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

describe('Watchlist API', () => {
  it('rejects watchlist without auth', async () => {
    const res = await request(app).get('/api/watchlist');
    expect(res.status).toBe(401);
  });

  it('adds to watchlist', async () => {
    const res = await request(app)
      .post('/api/watchlist')
      .set(authHeader(state.userToken))
      .send({ movieId: state.movieId, status: 'WATCHLIST' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('WATCHLIST');
    expect(res.body.watchlistId).toBeDefined();
  });

  it('marks as watched via upsert', async () => {
    const res = await request(app)
      .post('/api/watchlist')
      .set(authHeader(state.userToken))
      .send({ movieId: state.movieId, status: 'WATCHED' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('WATCHED');
  });

  it('rejects invalid watchlist status', async () => {
    const res = await request(app)
      .post('/api/watchlist')
      .set(authHeader(state.userToken))
      .send({ movieId: state.movieId, status: 'INVALID' });
    expect(res.status).toBe(400);
  });

  it('rejects watchlist for non-existent movie', async () => {
    const res = await request(app)
      .post('/api/watchlist')
      .set(authHeader(state.userToken))
      .send({ movieId: '00000000-0000-0000-0000-000000000000', status: 'WATCHLIST' });
    expect(res.status).toBe(404);
  });

  it('filters watched items', async () => {
    const res = await request(app)
      .get('/api/watchlist')
      .query({ status: 'WATCHED' })
      .set(authHeader(state.userToken));
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body.every((m: { status: string }) => m.status === 'WATCHED')).toBe(true);
  });

  it('filters watchlist items', async () => {
    await request(app)
      .post('/api/watchlist')
      .set(authHeader(state.userToken))
      .send({ movieId: state.movieId, status: 'WATCHLIST' });

    const res = await request(app)
      .get('/api/watchlist')
      .query({ status: 'WATCHLIST' })
      .set(authHeader(state.userToken));
    expect(res.status).toBe(200);
    expect(res.body.some((m: { status: string }) => m.status === 'WATCHLIST')).toBe(true);
  });

  it('removes item from watchlist', async () => {
    const res = await request(app)
      .delete(`/api/watchlist/${state.movieId}`)
      .set(authHeader(state.userToken));
    expect(res.status).toBe(204);
  });

  it('returns 404 when removing non-existent watchlist item', async () => {
    const res = await request(app)
      .delete(`/api/watchlist/${state.movieId}`)
      .set(authHeader(state.userToken));
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Watchlist item not found');
  });
});
