import fs from 'fs';
import path from 'path';

const logDir = path.join(process.cwd(), 'logs');
const logFile = path.join(logDir, 'social-feed.log');

export function publishNewFilmAnnouncement(movie: {
  title: string;
  genre: string;
  year?: number | null;
  rating?: number | null;
}) {
  const message = [
    `🎬 New film on CinemaVault: ${movie.title}`,
    movie.year ? `Year: ${movie.year}` : null,
    `Genre: ${movie.genre}`,
    movie.rating != null ? `Rating: ${movie.rating}/10` : null,
    `Published: ${new Date().toISOString()}`,
  ].filter(Boolean).join(' | ');

  fs.mkdirSync(logDir, { recursive: true });
  fs.appendFileSync(logFile, `${message}\n`);
  console.log(`[Social Feed] ${message}`);
  return message;
}
