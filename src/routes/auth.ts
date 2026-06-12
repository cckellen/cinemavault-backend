import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest, getJwtSecret } from '../middleware/auth';

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function formatUser(user: { id: string; email: string; role: string; username: string | null; avatarUrl: string | null }) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    username: user.username,
    avatarUrl: user.avatarUrl,
    avatar: user.avatarUrl,
  };
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        username,
        role: email.toLowerCase().includes('admin') ? 'ADMIN' : 'USER',
      },
    });

    const token = jwt.sign({ id: user.id, role: user.role }, getJwtSecret(), { expiresIn: '7d' });
    res.status(201).json({ token, user: formatUser(user) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    res.status(400).json({ error: message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, getJwtSecret(), { expiresIn: '7d' });
    res.json({ token, user: formatUser(user) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    res.status(400).json({ error: message });
  }
});

router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  res.json(formatUser(req.user!));
});

export default router;
