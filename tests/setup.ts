import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key';
