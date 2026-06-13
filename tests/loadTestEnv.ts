import dotenv from 'dotenv';
import path from 'path';

const PLACEHOLDER_VALUES = [
  'yourpassword',
  'your_omdb_api_key',
  'test-omdb-key',
  'changeme',
  'changeinproduction',
];

function isPlaceholder(value: string): boolean {
  const lower = value.toLowerCase();
  return PLACEHOLDER_VALUES.some((p) => lower.includes(p));
}

export function loadTestEnv(): void {
  const testEnvPath = path.resolve(__dirname, '../.env.test');
  const result = dotenv.config({ path: testEnvPath, override: true });

  if (result.error) {
    throw new Error(
      `Missing .env.test file. Copy .env.test.example to .env.test and fill in real values.\n` +
      `  cp .env.test.example .env.test`
    );
  }

  const missing: string[] = [];
  if (!process.env.DATABASE_URL?.trim()) missing.push('DATABASE_URL');
  if (!process.env.JWT_SECRET?.trim()) missing.push('JWT_SECRET');
  if (!process.env.OMDB_API_KEY?.trim()) missing.push('OMDB_API_KEY');

  if (missing.length > 0) {
    throw new Error(
      `.env.test is incomplete. Required variables: ${missing.join(', ')}`
    );
  }

  if (!process.env.DATABASE_URL!.includes('cinemavault_test')) {
    throw new Error(
      '.env.test DATABASE_URL must point to cinemavault_test (not production cinemavault).'
    );
  }

  if (isPlaceholder(process.env.DATABASE_URL!)) {
    throw new Error(
      '.env.test DATABASE_URL still contains placeholder credentials (e.g. yourpassword). ' +
      'Set your real MySQL username and password.'
    );
  }

  if (isPlaceholder(process.env.OMDB_API_KEY!)) {
    throw new Error(
      '.env.test OMDB_API_KEY is a placeholder. Set your real OMDB API key from https://www.omdbapi.com/apikey.aspx'
    );
  }

  process.env.NODE_ENV = 'test';
}

export function assertTestDatabase(): void {
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl.includes('cinemavault_test')) {
    throw new Error('Tests must use cinemavault_test database only.');
  }
}
