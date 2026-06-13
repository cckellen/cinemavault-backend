import prisma from '../src/lib/prisma';
import request from 'supertest';
import { createApp } from '../src/app';
import {
  fetchOmdbById,
  omdbToMovieData,
  OmdbMovie,
  searchOmdb,
} from '../src/utils/omdb';
import {
  authHeader,
  cleanupTestData,
  connectDb,
  disconnectDb,
  registerAdmin,
  state,
  testRunId,
} from './helpers';

const app = createApp();

const mockOmdbMovie: OmdbMovie = {
  imdbID: `tt-test-${testRunId}`,
  Title: `OMDB Import ${testRunId}`,
  Year: '2020',
  Rated: 'PG-13',
  Released: '01 Jan 2020',
  Runtime: '120 min',
  Genre: 'Action, Drama',
  Director: 'Test Director',
  Plot: 'Imported plot',
  Actors: 'Actor A, Actor B',
  Poster: 'https://example.com/omdb-poster.jpg',
  imdbRating: '8.1',
  Response: 'True',
};

beforeAll(async () => {
  await connectDb();
  await registerAdmin(app);
  await prisma.movie.deleteMany({ where: { omdbId: { in: ['tt0133093', 'tt1375666'] } } });
});

afterAll(async () => {
  await cleanupTestData();
  await disconnectDb();
});

describe('OMDB utility functions', () => {
  it('omdbToMovieData maps full OMDB response to movie fields', () => {
    const data = omdbToMovieData(mockOmdbMovie);
    expect(data.title).toBe(mockOmdbMovie.Title);
    expect(data.genre).toBe('Action');
    expect(data.imdbRating).toBe(8.1);
  });

  it('searchOmdb calls real OMDB API with configured key', async () => {
    const apiKey = process.env.OMDB_API_KEY!;
    const results = await searchOmdb('Matrix', apiKey);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].Title).toMatch(/matrix/i);
  }, 15000);

  it('fetchOmdbById calls real OMDB API for tt0133093 (The Matrix)', async () => {
    const apiKey = process.env.OMDB_API_KEY!;
    const movie = await fetchOmdbById('tt0133093', apiKey);
    expect(movie).not.toBeNull();
    expect(movie?.Title).toMatch(/matrix/i);
  }, 15000);
});

describe('GET /api/omdb/search', () => {
  it('rejects search without query parameter', async () => {
    const res = await request(app).get('/api/omdb/search');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Query parameter q is required');
  });

  it('returns real OMDB search results using .env.test API key', async () => {
    const res = await request(app).get('/api/omdb/search').query({ q: 'Inception' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].Title).toMatch(/inception/i);
  }, 15000);
});

describe('POST /api/admin/movies/import', () => {
  it('rejects import without imdbId', async () => {
    const res = await request(app)
      .post('/api/admin/movies/import')
      .set(authHeader(state.adminToken))
      .send({});
    expect(res.status).toBe(400);
  });

  it('imports movie from real OMDB API', async () => {
    const res = await request(app)
      .post('/api/admin/movies/import')
      .set(authHeader(state.adminToken))
      .send({ imdbId: 'tt0133093' });
    expect(res.status).toBe(201);
    expect(res.body.title).toMatch(/matrix/i);
    expect(res.body.omdbId).toBe('tt0133093');

    await request(app)
      .delete(`/api/admin/movies/${res.body.id}`)
      .set(authHeader(state.adminToken));
  }, 15000);
});
