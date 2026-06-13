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

describe('Favorites API', () => {
  it('rejects favorites without auth', async () => {
    const res = await request(app).get('/api/favorites');
    expect(res.status).toBe(401);
  });

  it('adds movie to favorites via POST body', async () => {
    const res = await request(app)
      .post('/api/favorites')
      .set(authHeader(state.userToken))
      .send({ movieId: state.movieId });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Added to favorites');
    expect(res.body.movie.id).toBe(state.movieId);
  });

  it('rejects duplicate favorite', async () => {
    const res = await request(app)
      .post('/api/favorites')
      .set(authHeader(state.userToken))
      .send({ movieId: state.movieId });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Already in favorites');
  });

  it('rejects favorite with invalid movieId format', async () => {
    const res = await request(app)
      .post('/api/favorites')
      .set(authHeader(state.userToken))
      .send({ movieId: 'not-a-uuid' });
    expect(res.status).toBe(400);
  });

  it('rejects favorite for non-existent movie', async () => {
    const res = await request(app)
      .post('/api/favorites')
      .set(authHeader(state.userToken))
      .send({ movieId: '00000000-0000-0000-0000-000000000000' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Movie not found');
  });

  it('lists user favorites', async () => {
    const res = await request(app)
      .get('/api/favorites')
      .set(authHeader(state.userToken));
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].title).toBeDefined();
  });

  it('adds movie to favorites via path param', async () => {
    await request(app)
      .delete(`/api/favorites/${state.movieId}`)
      .set(authHeader(state.userToken));

    const res = await request(app)
      .post(`/api/favorites/${state.movieId}`)
      .set(authHeader(state.userToken));
    expect(res.status).toBe(201);
    expect(res.body.movie.id).toBe(state.movieId);
  });

  it('removes favorite', async () => {
    const res = await request(app)
      .delete(`/api/favorites/${state.movieId}`)
      .set(authHeader(state.userToken));
    expect(res.status).toBe(204);
  });

  it('returns 404 when removing non-existent favorite', async () => {
    const res = await request(app)
      .delete(`/api/favorites/${state.movieId}`)
      .set(authHeader(state.userToken));
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Favorite not found');
  });
});
