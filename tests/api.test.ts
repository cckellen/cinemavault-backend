import request from 'supertest';
import { createApp } from '../src/app';
import prisma from '../src/lib/prisma';

const app = createApp();

const testRunId = Date.now();
const adminEmail = `admin-${testRunId}@cinemavault.test`;
const userEmail = `user-${testRunId}@cinemavault.test`;
const password = 'testpass123';

let adminToken = '';
let userToken = '';
let movieId = '';
let messageId = '';

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.favorite.deleteMany({ where: { user: { email: { in: [adminEmail, userEmail] } } } });
  await prisma.watchlistItem.deleteMany({ where: { user: { email: { in: [adminEmail, userEmail] } } } });
  await prisma.message.deleteMany({ where: { OR: [{ fromUser: { email: { in: [adminEmail, userEmail] } } }, { toUser: { email: { in: [adminEmail, userEmail] } } }] } });
  await prisma.movie.deleteMany({ where: { title: { startsWith: `Test Movie ${testRunId}` } } });
  await prisma.user.deleteMany({ where: { email: { in: [adminEmail, userEmail] } } });
  await prisma.$disconnect();
});

describe('Auth API', () => {
  it('rejects registration with invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'testpass123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('registers admin user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: adminEmail, password, username: 'TestAdmin' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('ADMIN');
    adminToken = res.body.token;
  });

  it('registers regular user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: userEmail, password, username: 'TestUser' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('USER');
    userToken = res.body.token;
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
  });

  it('logs in successfully', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: userEmail, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    userToken = res.body.token;
  });

  it('returns current user with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(userEmail);
  });

  it('rejects /auth/me without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects /auth/me with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);
  });
});

describe('Movies API', () => {
  it('allows public GET on movies without auth', async () => {
    const res = await request(app).get('/api/movies');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.headers.etag).toBeDefined();
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
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: `Test Movie ${testRunId}`, genre: 'Action', year: 2024, rating: 8.5 });
    expect(res.status).toBe(403);
  });

  it('creates movie as admin', async () => {
    const res = await request(app)
      .post('/api/admin/movies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Test Movie ${testRunId}`,
        genre: 'Sci-Fi',
        year: 2024,
        rating: 8.7,
        poster: 'https://example.com/poster.jpg',
        plot: 'A test movie plot',
      });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe(`Test Movie ${testRunId}`);
    expect(res.body._links).toBeDefined();
    movieId = res.body.id;
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

  it('filters movies by minRating', async () => {
    const res = await request(app).get('/api/movies').query({ minRating: 8 });
    expect(res.status).toBe(200);
    res.body.data.forEach((m: { rating: number }) => {
      if (m.rating != null) expect(m.rating).toBeGreaterThanOrEqual(8);
    });
  });

  it('returns 304 for movie list with matching ETag', async () => {
    const first = await request(app).get('/api/movies');
    const res = await request(app).get('/api/movies').set('If-None-Match', first.headers.etag);
    expect(res.status).toBe(304);
  });

  it('returns single movie with HATEOAS links', async () => {
    const res = await request(app).get(`/api/movies/${movieId}`);
    expect(res.status).toBe(200);
    expect(res.body._links.self).toBeDefined();
    expect(res.headers.etag).toBeDefined();
  });

  it('returns 304 on conditional request with matching ETag', async () => {
    const first = await request(app).get(`/api/movies/${movieId}`);
    const etag = first.headers.etag;
    const res = await request(app)
      .get(`/api/movies/${movieId}`)
      .set('If-None-Match', etag);
    expect(res.status).toBe(304);
  });

  it('updates movie as admin', async () => {
    const res = await request(app)
      .put(`/api/admin/movies/${movieId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rating: 9.0 });
    expect(res.status).toBe(200);
    expect(res.body.rating).toBe(9);
  });

  it('returns 404 for unknown movie', async () => {
    const res = await request(app).get('/api/movies/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});

describe('Favorites API', () => {
  it('rejects favorites without auth', async () => {
    const res = await request(app).get('/api/favorites');
    expect(res.status).toBe(401);
  });

  it('adds movie to favorites', async () => {
    const res = await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ movieId });
    expect(res.status).toBe(201);
  });

  it('rejects duplicate favorite', async () => {
    const res = await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ movieId });
    expect(res.status).toBe(409);
  });

  it('lists user favorites', async () => {
    const res = await request(app)
      .get('/api/favorites')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].title).toBeDefined();
  });

  it('removes favorite', async () => {
    const res = await request(app)
      .delete(`/api/favorites/${movieId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(204);
  });
});

describe('Messages API', () => {
  it('sends message to admin', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ content: 'Interested in this film!', movieId });
    expect(res.status).toBe(201);
    expect(res.body.from).toBeDefined();
    messageId = res.body.id;
  });

  it('rejects empty message', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ content: '' });
    expect(res.status).toBe(400);
  });

  it('admin can view all messages', async () => {
    const res = await request(app)
      .get('/api/messages')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('admin can reply to message', async () => {
    const res = await request(app)
      .post(`/api/messages/${messageId}/reply`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ content: 'Thank you for your interest!' });
    expect(res.status).toBe(201);
    expect(res.body.content).toContain('Thank you');
  });

  it('non-admin cannot reply', async () => {
    const res = await request(app)
      .post(`/api/messages/${messageId}/reply`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ content: 'Unauthorized reply' });
    expect(res.status).toBe(403);
  });

  it('admin can delete message', async () => {
    const res = await request(app)
      .delete(`/api/messages/${messageId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
  });
});

describe('Watchlist API', () => {
  it('adds to watchlist', async () => {
    const res = await request(app)
      .post('/api/watchlist')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ movieId, status: 'WATCHLIST' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('WATCHLIST');
  });

  it('marks as watched', async () => {
    const res = await request(app)
      .post('/api/watchlist')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ movieId, status: 'WATCHED' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('WATCHED');
  });

  it('filters watched items', async () => {
    const res = await request(app)
      .get('/api/watchlist')
      .query({ status: 'WATCHED' })
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

describe('API Root', () => {
  it('returns HATEOAS links at root', async () => {
    const res = await request(app).get('/api');
    expect(res.status).toBe(200);
    expect(res.body._links).toBeDefined();
    expect(res.body._links.movies).toBeDefined();
  });
});
