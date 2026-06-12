import express from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { toMovieResponse, fromMovieInput } from '../utils/movie';
import { fetchOmdbById, omdbToMovieData } from '../utils/omdb';
import { publishNewFilmAnnouncement } from '../utils/social';

const router = express.Router();

const movieSchema = z.object({
  title: z.string().min(1),
  titleZh: z.string().optional(),
  plot: z.string().optional(),
  genre: z.string().min(1),
  year: z.number().int().optional(),
  imdbRating: z.number().min(0).max(10).optional(),
  rating: z.number().min(0).max(10).optional(),
  posterUrl: z.string().optional(),
  poster: z.string().optional(),
  director: z.string().optional(),
  castInfo: z.string().optional(),
  runtime: z.string().optional(),
  omdbId: z.string().optional(),
  isActive: z.boolean().optional(),
});

router.use(authenticateToken, requireAdmin);

router.get('/movies', async (_req, res) => {
  const movies = await prisma.movie.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(movies.map((m) => toMovieResponse(m)));
});

router.post('/movies', async (req: AuthRequest, res) => {
  try {
    const parsed = movieSchema.parse(req.body);
    const data = fromMovieInput(parsed);
    const movie = await prisma.movie.create({ data: { ...data, isActive: data.isActive ?? true } });
    if (movie.isActive) {
      publishNewFilmAnnouncement({
        title: movie.title,
        genre: movie.genre,
        year: movie.year,
        rating: movie.imdbRating != null ? Number(movie.imdbRating) : null,
      });
    }
    res.status(201).json(toMovieResponse(movie));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid movie data';
    res.status(400).json({ error: message });
  }
});

router.put('/movies/:id', async (req: AuthRequest, res) => {
  try {
    const parsed = movieSchema.partial().parse(req.body);
    const data = fromMovieInput(parsed);
    const movie = await prisma.movie.update({ where: { id: req.params.id }, data });
    res.json(toMovieResponse(movie));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Update failed';
    res.status(400).json({ error: message });
  }
});

router.delete('/movies/:id', async (req: AuthRequest, res) => {
  try {
    await prisma.movie.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: 'Movie not found' });
  }
});

router.post('/movies/import', async (req: AuthRequest, res) => {
  const { imdbId } = req.body;
  if (!imdbId) return res.status(400).json({ error: 'imdbId is required' });

  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'OMDB API key not configured' });

  try {
    const omdb = await fetchOmdbById(imdbId, apiKey);
    if (!omdb) return res.status(404).json({ error: 'Movie not found on OMDB' });

    const existing = await prisma.movie.findUnique({ where: { omdbId: imdbId } });
    if (existing) return res.status(409).json({ error: 'Movie already imported', movie: toMovieResponse(existing) });

    const movie = await prisma.movie.create({ data: omdbToMovieData(omdb) });
    res.status(201).json(toMovieResponse(movie));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Import failed';
    res.status(500).json({ error: message });
  }
});

export default router;
