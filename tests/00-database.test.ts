import prisma from '../src/lib/prisma';
import {
  assertTestDatabase,
  connectDb,
  disconnectDb,
} from './helpers';

beforeAll(async () => {
  assertTestDatabase();
  await connectDb();
});

afterAll(async () => {
  await disconnectDb();
});

describe('Test database connection (.env.test)', () => {
  it('uses cinemavault_test from .env.test DATABASE_URL', async () => {
    expect(process.env.DATABASE_URL).toContain('cinemavault_test');
    const rows = await prisma.$queryRaw<Array<{ db: string | null }>>`SELECT DATABASE() AS db`;
    expect(rows[0]?.db).toBe('cinemavault_test');
  });

  it('has OMDB_API_KEY configured in .env.test', () => {
    expect(process.env.OMDB_API_KEY).toBeTruthy();
    expect(process.env.OMDB_API_KEY).not.toMatch(/your_omdb_api_key|test-omdb-key/i);
  });
});
