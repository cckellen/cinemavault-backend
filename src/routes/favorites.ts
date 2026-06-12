import express from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { toMovieResponse } from '../utils/movie';

const router = express.Router();

const addSchema = z.object({ movieId: z.string().uuid() });

router.use(authenticateToken);

router.get('/', async (req: AuthRequest, res) => {
  const favorites = await prisma.favorite.findMany({
    where: { userId: req.user!.id },
    include: { movie: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(favorites.map((f) => toMovieResponse(f.movie)));
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { movieId } = addSchema.parse(req.body);
    const movie = await prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) return res.status(404).json({ error: 'Movie not found' });

    const existing = await prisma.favorite.findUnique({
      where: { userId_movieId: { userId: req.user!.id, movieId } },
    });
    if (existing) return res.status(409).json({ error: 'Already in favorites' });

    await prisma.favorite.create({ data: { userId: req.user!.id, movieId } });
    res.status(201).json({ message: 'Added to favorites', movie: toMovieResponse(movie) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid request';
    res.status(400).json({ error: message });
  }
});

router.post('/:movieId', async (req: AuthRequest, res) => {
  try {
    const { movieId } = req.params;
    const movie = await prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) return res.status(404).json({ error: 'Movie not found' });

    const existing = await prisma.favorite.findUnique({
      where: { userId_movieId: { userId: req.user!.id, movieId } },
    });
    if (existing) return res.status(409).json({ error: 'Already in favorites' });

    await prisma.favorite.create({ data: { userId: req.user!.id, movieId } });
    res.status(201).json({ message: 'Added to favorites', movie: toMovieResponse(movie) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid request';
    res.status(400).json({ error: message });
  }
});

router.delete('/:movieId', async (req: AuthRequest, res) => {
  try {
    await prisma.favorite.delete({
      where: { userId_movieId: { userId: req.user!.id, movieId: req.params.movieId } },
    });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: 'Favorite not found' });
  }
});

export default router;
