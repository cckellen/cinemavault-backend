import prisma from '../src/lib/prisma';
import { loadTestEnv, assertTestDatabase } from './loadTestEnv';

export default async function globalSetup(): Promise<void> {
  loadTestEnv();
  assertTestDatabase();

  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    // eslint-disable-next-line no-console
    console.log('\n✓ .env.test database connected (cinemavault_test)\n');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      [
        'Cannot connect using .env.test DATABASE_URL — tests require a real MySQL connection.',
        '',
        'Check:',
        '  1. MySQL is running',
        '  2. .env.test has correct username/password (not placeholders)',
        '  3. CREATE DATABASE IF NOT EXISTS cinemavault_test;',
        '  4. npx prisma db push',
        '',
        `Error: ${msg}`,
      ].join('\n')
    );
  } finally {
    await prisma.$disconnect();
  }
}
