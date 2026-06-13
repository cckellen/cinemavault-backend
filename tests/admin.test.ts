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

const mockOmdbMovie = {
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
  await registerUser(app);
  state.movieId = await createTestMovie(app);
});

afterAll(async () => {
  await cleanupTestData();
  await disconnectDb();
});

describe('Admin Movies API', () => {
  it('rejects admin movie list without auth', async () => {
    const res = await request(app).get('/api/admin/movies');
    expect(res.status).toBe(401);
  });

  it('rejects admin movie list for non-admin', async () => {
    const res = await request(app)
      .get('/api/admin/movies')
      .set(authHeader(state.userToken));
    expect(res.status).toBe(403);
  });

  it('lists all movies including inactive for admin', async () => {
    const res = await request(app)
      .get('/api/admin/movies')
      .set(authHeader(state.adminToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((m: { id: string }) => m.id === state.movieId)).toBe(true);
  });

  it('creates movie as admin via /api/admin/movies', async () => {
    const res = await request(app)
      .post('/api/admin/movies')
      .set(authHeader(state.adminToken))
      .send({
        title: `Test Movie ${testRunId}-admin`,
        genre: 'Horror',
        year: 2022,
        rating: 6.5,
      });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe(`Test Movie ${testRunId}-admin`);
  });

  it('admin soft-deletes movie via /api/admin/movies/:id', async () => {
    const createRes = await request(app)
      .post('/api/admin/movies')
      .set(authHeader(state.adminToken))
      .send({
        title: `Test Movie ${testRunId}-delete`,
        genre: 'Comedy',
        year: 2021,
      });
    const deleteId = createRes.body.id;

    const res = await request(app)
      .delete(`/api/admin/movies/${deleteId}`)
      .set(authHeader(state.adminToken));
    expect(res.status).toBe(204);

    const listRes = await request(app)
      .get('/api/admin/movies')
      .set(authHeader(state.adminToken));
    const deleted = listRes.body.find((m: { id: string; isActive: boolean }) => m.id === deleteId);
    expect(deleted?.isActive).toBe(false);
  });

  it('returns 404 when deleting unknown movie', async () => {
    const res = await request(app)
      .delete('/api/admin/movies/00000000-0000-0000-0000-000000000000')
      .set(authHeader(state.adminToken));
    expect(res.status).toBe(404);
  });
});

describe('Admin OMDB Import API', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects import without imdbId', async () => {
    const res = await request(app)
      .post('/api/admin/movies/import')
      .set(authHeader(state.adminToken))
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('imdbId is required');
  });

  it('rejects import without auth', async () => {
    const res = await request(app)
      .post('/api/admin/movies/import')
      .send({ imdbId: 'tt1234567' });
    expect(res.status).toBe(401);
  });

  it('returns 404 when movie not found on OMDB', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({ Response: 'False', Error: 'Movie not found!' }),
    } as Response);

    const res = await request(app)
      .post('/api/admin/movies/import')
      .set(authHeader(state.adminToken))
      .send({ imdbId: 'tt0000000' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Movie not found on OMDB');
  });

  it('imports movie from OMDB successfully', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => mockOmdbMovie,
    } as Response);

    const res = await request(app)
      .post('/api/admin/movies/import')
      .set(authHeader(state.adminToken))
      .send({ imdbId: mockOmdbMovie.imdbID });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe(mockOmdbMovie.Title);
    expect(res.body.omdbId).toBe(mockOmdbMovie.imdbID);
  });

  it('rejects duplicate OMDB import', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => mockOmdbMovie,
    } as Response);

    const res = await request(app)
      .post('/api/admin/movies/import')
      .set(authHeader(state.adminToken))
      .send({ imdbId: mockOmdbMovie.imdbID });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Movie already imported');
    expect(res.body.movie).toBeDefined();
  });
});
