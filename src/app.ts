import express from 'express';
import cors from 'cors';
import path from 'path';
import swaggerUi from 'swagger-ui-express';

import authRoutes from './routes/auth';
import movieRoutes from './routes/movies';
import adminRoutes from './routes/admin';
import favoriteRoutes from './routes/favorites';
import messageRoutes from './routes/messages';
import profileRoutes from './routes/profile';
import watchlistRoutes from './routes/watchlist';
import omdbRoutes from './routes/omdb';
import metaRoutes from './routes/meta';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const swaggerDocument = require('../swagger.json');

export function createApp() {
  const app = express();

  const port = process.env.PORT || '5000';
  const serverOrigins = [
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
  ];
  const allowedOrigins = [
    ...new Set([
      ...serverOrigins,
      ...(process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ]),
  ];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }));

  app.use(express.json());
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  app.get('/api', (_req, res) => {
    res.json({
      name: 'CinemaVault API',
      version: '1.0.0',
      _links: {
        docs: { href: '/api-docs' },
        movies: { href: '/api/movies' },
        auth: { href: '/api/auth/login' },
      },
    });
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.use('/api/auth', authRoutes);
  app.use('/api/movies', movieRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/favorites', favoriteRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/watchlist', watchlistRoutes);
  app.use('/api/omdb', omdbRoutes);
  app.use('/api', metaRoutes);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err.message === 'Not allowed by CORS') {
      return res.status(403).json({ error: 'CORS policy violation' });
    }
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  return app;
}

export default createApp;
