import express from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'CinemaVault API',
  });
});

router.get('/genres', async (_req, res) => {
  const movies = await prisma.movie.findMany({
    where: { isActive: true },
    select: { genre: true },
    distinct: ['genre'],
    orderBy: { genre: 'asc' },
  });
  const genres = movies.map((m) => m.genre).filter(Boolean);
  res.json({ genres });
});

router.get('/stats', authenticateToken, requireAdmin, async (_req: AuthRequest, res) => {
  const [movies, users, messages, favorites] = await Promise.all([
    prisma.movie.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.message.count(),
    prisma.favorite.count(),
  ]);
  res.json({
    activeMovies: movies,
    totalUsers: users,
    totalMessages: messages,
    totalFavorites: favorites,
  });
});

export default router;
