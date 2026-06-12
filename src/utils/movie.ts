import { Movie } from '@prisma/client';

export interface MovieResponse {
  id: string;
  title: string;
  titleZh?: string | null;
  plot?: string | null;
  genre: string;
  year?: number | null;
  rating?: number | null;
  imdbRating?: number | null;
  poster?: string | null;
  posterUrl?: string | null;
  director?: string | null;
  castInfo?: string | null;
  runtime?: string | null;
  omdbId?: string | null;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  _links?: Record<string, { href: string; method?: string }>;
}

export function toMovieResponse(movie: Movie, baseUrl = ''): MovieResponse {
  const rating = movie.imdbRating != null ? Number(movie.imdbRating) : null;
  return {
    id: movie.id,
    title: movie.title,
    titleZh: movie.titleZh,
    plot: movie.plot,
    genre: movie.genre,
    year: movie.year,
    rating,
    imdbRating: rating,
    poster: movie.posterUrl,
    posterUrl: movie.posterUrl,
    director: movie.director,
    castInfo: movie.castInfo,
    runtime: movie.runtime,
    omdbId: movie.omdbId,
    isActive: movie.isActive,
    createdAt: movie.createdAt,
    updatedAt: movie.updatedAt,
    _links: {
      self: { href: `${baseUrl}/api/movies/${movie.id}` },
      collection: { href: `${baseUrl}/api/movies` },
      update: { href: `${baseUrl}/api/admin/movies/${movie.id}`, method: 'PUT' },
      delete: { href: `${baseUrl}/api/admin/movies/${movie.id}`, method: 'DELETE' },
      favorite: { href: `${baseUrl}/api/favorites`, method: 'POST' },
      watchlist: { href: `${baseUrl}/api/watchlist`, method: 'POST' },
    },
  };
}

export function fromMovieInput(body: Record<string, unknown>) {
  return {
    title: body.title as string,
    titleZh: body.titleZh as string | undefined,
    plot: body.plot as string | undefined,
    genre: body.genre as string,
    year: body.year != null ? Number(body.year) : undefined,
    imdbRating: (body.imdbRating ?? body.rating) != null
      ? Number(body.imdbRating ?? body.rating)
      : undefined,
    posterUrl: (body.posterUrl ?? body.poster) as string | undefined,
    director: body.director as string | undefined,
    castInfo: body.castInfo as string | undefined,
    runtime: body.runtime as string | undefined,
    omdbId: body.omdbId as string | undefined,
    isActive: body.isActive as boolean | undefined,
  };
}
