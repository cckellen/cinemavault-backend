import express from 'express';
import { searchOmdb } from '../utils/omdb';

const router = express.Router();

router.get('/search', async (req, res) => {
  const query = req.query.q as string;
  if (!query) return res.status(400).json({ error: 'Query parameter q is required' });

  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'OMDB API key not configured' });

  try {
    const results = await searchOmdb(query, apiKey);
    res.json(results);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'OMDB search failed';
    res.status(500).json({ error: message });
  }
});

export default router;
