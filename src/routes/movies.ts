import express from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { toMovieResponse, fromMovieInput, deactivateMovie } from '../utils/movie';
import { generateETag, setConditionalHeaders, isNotModified } from '../utils/etag';

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

router.get('/', async (req, res) => {
  const { search, genre, year, minRating, sort, page = '1', limit = '20' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
  const skip = (pageNum - 1) * limitNum;

  const where: Record<string, unknown> = { isActive: true };
  if (search) {
    where.OR = [
      { title: { contains: search as string } },
      { plot: { contains: search as string } },
      { director: { contains: search as string } },
    ];
  }
  if (genre) where.genre = { contains: genre as string };
  if (year) where.year = parseInt(year as string);
  if (minRating) where.imdbRating = { gte: parseFloat(minRating as string) };

  let orderBy: Record<string, string> = { createdAt: 'desc' };
  if (sort === 'title') orderBy = { title: 'asc' };
  else if (sort === 'year') orderBy = { year: 'desc' };
  else if (sort === 'rating') orderBy = { imdbRating: 'desc' };

  const [movies, total] = await Promise.all([
    prisma.movie.findMany({ where, orderBy, skip, take: limitNum }),
    prisma.movie.count({ where }),
  ]);

  const formatted = movies.map((m) => toMovieResponse(m));
  const payload = {
    data: formatted,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    _links: {
      self: { href: '/api/movies' },
    },
  };
  const etag = generateETag(payload);

  if (isNotModified(req, etag)) {
    return res.status(304).end();
  }

  setConditionalHeaders(res, etag);
  res.json(payload);
});

router.get('/:id', async (req, res) => {
  const movie = await prisma.movie.findUnique({ where: { id: req.params.id } });
  if (!movie || !movie.isActive) {
    return res.status(404).json({ error: 'Movie not found' });
  }

  const formatted = toMovieResponse(movie);
  const etag = generateETag(formatted);

  if (isNotModified(req, etag, movie.updatedAt)) {
    return res.status(304).end();
  }

  setConditionalHeaders(res, etag, movie.updatedAt);
  res.json(formatted);
});

router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const parsed = movieSchema.parse(req.body);
    const data = fromMovieInput(parsed);
    const movie = await prisma.movie.create({ data });
    res.status(201).json(toMovieResponse(movie));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid movie data';
    res.status(400).json({ error: message });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const parsed = movieSchema.partial().parse(req.body);
    const data = fromMovieInput(parsed);
    const movie = await prisma.movie.update({ where: { id }, data });
    res.json(toMovieResponse(movie));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Update failed';
    res.status(400).json({ error: message });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  const movie = await deactivateMovie(req.params.id);
  if (!movie) return res.status(404).json({ error: 'Movie not found' });
  res.status(204).send();
});

export default router;
