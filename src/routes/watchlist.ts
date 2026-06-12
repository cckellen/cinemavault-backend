import express from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { toMovieResponse } from '../utils/movie';

const router = express.Router();

const watchlistSchema = z.object({
  movieId: z.string().uuid(),
  status: z.enum(['WATCHLIST', 'WATCHED']).default('WATCHLIST'),
});

router.use(authenticateToken);

router.get('/', async (req: AuthRequest, res) => {
  const { status } = req.query;
  const where: { userId: string; status?: 'WATCHLIST' | 'WATCHED' } = { userId: req.user!.id };
  if (status === 'WATCHLIST' || status === 'WATCHED') where.status = status;

  const items = await prisma.watchlistItem.findMany({
    where,
    include: { movie: true },
    orderBy: { updatedAt: 'desc' },
  });

  res.json(items.map((item) => ({
    ...toMovieResponse(item.movie),
    status: item.status,
    watchlistId: item.id,
  })));
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { movieId, status } = watchlistSchema.parse(req.body);
    const movie = await prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) return res.status(404).json({ error: 'Movie not found' });

    const item = await prisma.watchlistItem.upsert({
      where: { userId_movieId: { userId: req.user!.id, movieId } },
      create: { userId: req.user!.id, movieId, status },
      update: { status },
      include: { movie: true },
    });

    res.status(201).json({
      ...toMovieResponse(item.movie),
      status: item.status,
      watchlistId: item.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid request';
    res.status(400).json({ error: message });
  }
});

router.delete('/:movieId', async (req: AuthRequest, res) => {
  try {
    await prisma.watchlistItem.delete({
      where: { userId_movieId: { userId: req.user!.id, movieId: req.params.movieId } },
    });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: 'Watchlist item not found' });
  }
});

export default router;
