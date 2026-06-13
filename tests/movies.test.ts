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
  testRunId,
} from './helpers';

const app = createApp();

beforeAll(async () => {
  await connectDb();
  await registerAdmin(app);
  await registerUser(app);
  state.movieId = await createTestMovie(app);
  state.secondMovieId = await createTestMovie(app, '-2');
});

afterAll(async () => {
  await cleanupTestData();
  await disconnectDb();
});

describe('Movies API', () => {
  it('allows public GET on movies without auth', async () => {
    const res = await request(app).get('/api/movies');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.headers.etag).toBeDefined();
    expect(res.headers['content-type']).toMatch(/json/);
  });

  it('rejects movie creation without auth', async () => {
    const res = await request(app)
      .post('/api/movies')
      .send({ title: 'Unauthorized', genre: 'Action' });
    expect(res.status).toBe(401);
  });

  it('rejects movie creation by non-admin', async () => {
    const res = await request(app)
      .post('/api/movies')
      .set(authHeader(state.userToken))
      .send({ title: `Blocked ${testRunId}`, genre: 'Action', year: 2024, rating: 8.5 });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Admin access required');
  });

  it('rejects movie creation with invalid data', async () => {
    const res = await request(app)
      .post('/api/movies')
      .set(authHeader(state.adminToken))
      .send({ title: 'Missing Genre' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('rejects movie with rating out of range', async () => {
    const res = await request(app)
      .post('/api/movies')
      .set(authHeader(state.adminToken))
      .send({ title: 'Bad Rating', genre: 'Drama', rating: 15 });
    expect(res.status).toBe(400);
  });

  it('creates movie as admin via /api/movies', async () => {
    const res = await request(app)
      .post('/api/movies')
      .set(authHeader(state.adminToken))
      .send({
        title: `Test Movie ${testRunId}-via-movies`,
        genre: 'Drama',
        year: 2023,
        rating: 7.5,
      });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe(`Test Movie ${testRunId}-via-movies`);
    expect(res.body._links).toBeDefined();
  });

  it('filters movies by search', async () => {
    const res = await request(app).get('/api/movies').query({ search: `Test Movie ${testRunId}` });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('filters movies by genre and sort', async () => {
    const res = await request(app).get('/api/movies').query({ genre: 'Sci-Fi', sort: 'rating' });
    expect(res.status).toBe(200);
    expect(res.body.data.every((m: { genre: string }) => m.genre.includes('Sci-Fi'))).toBe(true);
  });

  it('filters movies by year', async () => {
    const res = await request(app).get('/api/movies').query({ year: 2024 });
    expect(res.status).toBe(200);
    res.body.data.forEach((m: { year: number | null }) => {
      if (m.year != null) expect(m.year).toBe(2024);
    });
  });

  it('filters movies by minRating', async () => {
    const res = await request(app).get('/api/movies').query({ minRating: 8 });
    expect(res.status).toBe(200);
    res.body.data.forEach((m: { rating: number | null }) => {
      if (m.rating != null) expect(m.rating).toBeGreaterThanOrEqual(8);
    });
  });

  it('paginates movie list', async () => {
    const res = await request(app).get('/api/movies').query({ page: 1, limit: 2 });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(2);
  });

  it('returns 304 for movie list with matching ETag', async () => {
    const first = await request(app).get('/api/movies');
    const res = await request(app).get('/api/movies').set('If-None-Match', first.headers.etag);
    expect(res.status).toBe(304);
  });

  it('returns single movie with HATEOAS links', async () => {
    const res = await request(app).get(`/api/movies/${state.movieId}`);
    expect(res.status).toBe(200);
    expect(res.body._links.self).toBeDefined();
    expect(res.body._links.favorite).toBeDefined();
    expect(res.headers.etag).toBeDefined();
  });

  it('returns 304 on conditional request with matching ETag', async () => {
    const first = await request(app).get(`/api/movies/${state.movieId}`);
    const res = await request(app)
      .get(`/api/movies/${state.movieId}`)
      .set('If-None-Match', first.headers.etag);
    expect(res.status).toBe(304);
  });

  it('updates movie as admin', async () => {
    const res = await request(app)
      .put(`/api/admin/movies/${state.movieId}`)
      .set(authHeader(state.adminToken))
      .send({ rating: 9.0 });
    expect(res.status).toBe(200);
    expect(res.body.rating).toBe(9);
  });

  it('rejects movie update by non-admin', async () => {
    const res = await request(app)
      .put(`/api/movies/${state.movieId}`)
      .set(authHeader(state.userToken))
      .send({ rating: 5 });
    expect(res.status).toBe(403);
  });

  it('returns 404 for unknown movie', async () => {
    const res = await request(app).get('/api/movies/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Movie not found');
  });

  it('admin soft-deletes movie via /api/movies/:id', async () => {
    const res = await request(app)
      .delete(`/api/movies/${state.secondMovieId}`)
      .set(authHeader(state.adminToken));
    expect(res.status).toBe(204);

    const getRes = await request(app).get(`/api/movies/${state.secondMovieId}`);
    expect(getRes.status).toBe(404);
  });

  it('rejects movie delete by non-admin', async () => {
    const res = await request(app)
      .delete(`/api/movies/${state.movieId}`)
      .set(authHeader(state.userToken));
    expect(res.status).toBe(403);
  });
});

describe('API Root', () => {
  it('returns HATEOAS links at root', async () => {
    const res = await request(app).get('/api');
    expect(res.status).toBe(200);
    expect(res.body._links).toBeDefined();
    expect(res.body._links.movies).toBeDefined();
    expect(res.body.name).toBe('CinemaVault API');
  });

  it('returns 404 for unknown endpoint', async () => {
    const res = await request(app).get('/api/unknown-route');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Endpoint not found');
  });
});
