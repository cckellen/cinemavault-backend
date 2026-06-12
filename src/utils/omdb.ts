const OMDB_BASE = 'https://www.omdbapi.com';

export interface OmdbMovie {
  imdbID: string;
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Plot: string;
  Actors: string;
  Poster: string;
  imdbRating: string;
  Response: string;
  Error?: string;
}

export async function searchOmdb(query: string, apiKey: string): Promise<OmdbMovie[]> {
  const url = `${OMDB_BASE}/?s=${encodeURIComponent(query)}&apikey=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.Response === 'False') return [];
  return data.Search ?? [];
}

export async function fetchOmdbById(imdbId: string, apiKey: string): Promise<OmdbMovie | null> {
  const url = `${OMDB_BASE}/?i=${encodeURIComponent(imdbId)}&apikey=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.Response === 'False') return null;
  return data;
}

export function omdbToMovieData(omdb: OmdbMovie) {
  return {
    omdbId: omdb.imdbID,
    title: omdb.Title,
    plot: omdb.Plot !== 'N/A' ? omdb.Plot : undefined,
    genre: omdb.Genre !== 'N/A' ? omdb.Genre.split(', ')[0] : 'Unknown',
    year: omdb.Year !== 'N/A' ? parseInt(omdb.Year) : undefined,
    imdbRating: omdb.imdbRating !== 'N/A' ? parseFloat(omdb.imdbRating) : undefined,
    posterUrl: omdb.Poster !== 'N/A' ? omdb.Poster : undefined,
    director: omdb.Director !== 'N/A' ? omdb.Director : undefined,
    castInfo: omdb.Actors !== 'N/A' ? omdb.Actors : undefined,
    runtime: omdb.Runtime !== 'N/A' ? omdb.Runtime : undefined,
  };
}
