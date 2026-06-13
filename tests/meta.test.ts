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
  await createTestMovie(app);
});

afterAll(async () => {
  await cleanupTestData();
  await disconnectDb();
});

describe('Meta API', () => {
  it('returns health status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('CinemaVault API');
    expect(res.body.timestamp).toBeDefined();
  });

  it('returns distinct genres', async () => {
    const res = await request(app).get('/api/genres');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.genres)).toBe(true);
    expect(res.body.genres.length).toBeGreaterThanOrEqual(1);
  });

  it('rejects stats without auth', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(401);
  });

  it('rejects stats for non-admin user', async () => {
    const res = await request(app)
      .get('/api/stats')
      .set(authHeader(state.userToken));
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Admin access required');
  });

  it('returns admin stats', async () => {
    const res = await request(app)
      .get('/api/stats')
      .set(authHeader(state.adminToken));
    expect(res.status).toBe(200);
    expect(res.body.activeMovies).toBeDefined();
    expect(res.body.totalUsers).toBeDefined();
    expect(res.body.totalMessages).toBeDefined();
    expect(res.body.totalFavorites).toBeDefined();
  });
});

describe('OMDB Search API', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects search without query parameter', async () => {
    const res = await request(app).get('/api/omdb/search');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Query parameter q is required');
  });

  it('returns OMDB search results', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({
        Response: 'True',
        Search: [
          {
            imdbID: 'tt1375666',
            Title: 'Inception',
            Year: '2010',
            Type: 'movie',
            Poster: 'https://example.com/inception.jpg',
          },
        ],
      }),
    } as Response);

    const res = await request(app).get('/api/omdb/search').query({ q: 'Inception' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].Title).toBe('Inception');
  });

  it('returns empty array when OMDB finds no results', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({ Response: 'False', Error: 'Movie not found!' }),
    } as Response);

    const res = await request(app).get('/api/omdb/search').query({ q: 'zzzznotfound' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
