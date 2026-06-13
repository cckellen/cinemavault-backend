import request from 'supertest';
import { Express } from 'express';
import prisma from '../src/lib/prisma';

export const testRunId = Date.now();
export const adminEmail = `admin-${testRunId}@cinemavault.test`;
export const userEmail = `user-${testRunId}@cinemavault.test`;
export const password = 'testpass123';

export const state = {
  adminToken: '',
  userToken: '',
  movieId: '',
  messageId: '',
  secondMovieId: '',
};

export async function connectDb(): Promise<void> {
  await prisma.$connect();
}

export async function cleanupTestData(): Promise<void> {
  const emails = [adminEmail, userEmail];
  await prisma.favorite.deleteMany({ where: { user: { email: { in: emails } } } });
  await prisma.watchlistItem.deleteMany({ where: { user: { email: { in: emails } } } });
  await prisma.message.deleteMany({
    where: {
      OR: [
        { fromUser: { email: { in: emails } } },
        { toUser: { email: { in: emails } } },
      ],
    },
  });
  await prisma.movie.deleteMany({
    where: {
      OR: [
        { title: { startsWith: `Test Movie ${testRunId}` } },
        { omdbId: { startsWith: `tt-test-${testRunId}` } },
      ],
    },
  });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}

export async function registerAdmin(app: Express): Promise<void> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: adminEmail, password, username: 'TestAdmin' });
  if (res.status !== 201) {
    throw new Error(`Admin registration failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  state.adminToken = res.body.token;
}

export async function registerUser(app: Express): Promise<void> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: userEmail, password, username: 'TestUser' });
  if (res.status !== 201) {
    throw new Error(`User registration failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  state.userToken = res.body.token;
}

export async function createTestMovie(app: Express, suffix = ''): Promise<string> {
  const res = await request(app)
    .post('/api/admin/movies')
    .set('Authorization', `Bearer ${state.adminToken}`)
    .send({
      title: `Test Movie ${testRunId}${suffix}`,
      genre: 'Sci-Fi',
      year: 2024,
      rating: 8.7,
      poster: 'https://example.com/poster.jpg',
      plot: 'A test movie plot',
    });
  if (res.status !== 201) {
    throw new Error(`Movie creation failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.id as string;
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
