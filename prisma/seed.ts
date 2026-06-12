import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const sampleMovies = [
  { title: 'Inception', genre: 'Sci-Fi', year: 2010, imdbRating: 8.8, plot: 'A thief who steals secrets through dreams is given a chance at redemption.', director: 'Christopher Nolan', castInfo: 'Leonardo DiCaprio, Joseph Gordon-Levitt', posterUrl: 'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_SX300.jpg' },
  { title: 'The Dark Knight', genre: 'Action', year: 2008, imdbRating: 9.0, plot: 'Batman faces the Joker in Gotham City.', director: 'Christopher Nolan', castInfo: 'Christian Bale, Heath Ledger', posterUrl: 'https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_SX300.jpg' },
  { title: 'Parasite', genre: 'Drama', year: 2019, imdbRating: 8.5, plot: 'A poor family schemes to become employed by a wealthy household.', director: 'Bong Joon-ho', castInfo: 'Song Kang-ho, Lee Sun-kyun', posterUrl: 'https://m.media-amazon.com/images/M/MV5BYWZjZjk3ZTItODQ2ZC00NTY5LWE0ZDYtZTI3MjcwN2Q5NTg3XkEyXkFqcGdeQXVyODk4OTc4MTY@._V1_SX300.jpg' },
  { title: 'Spirited Away', genre: 'Animation', year: 2001, imdbRating: 8.6, plot: 'A girl enters a world ruled by gods and spirits.', director: 'Hayao Miyazaki', castInfo: 'Rumi Hiiragi, Miyu Irino', posterUrl: 'https://m.media-amazon.com/images/M/MV5BMjlmZmI5MDYtNDIyYy00NGQ3LTg4YjQtZmY4ZGM4NDE0MWY3XkEyXkFqcGdeQXVyODQ4OTc4MTY@._V1_SX300.jpg' },
  { title: 'The Shawshank Redemption', genre: 'Drama', year: 1994, imdbRating: 9.3, plot: 'Two imprisoned men bond over years finding solace and redemption.', director: 'Frank Darabont', castInfo: 'Tim Robbins, Morgan Freeman', posterUrl: 'https://m.media-amazon.com/images/M/MV5BNDE3ODcxYzMtY2YzZC00NmNlLWJiNDMtZDViZWM2MzIxZDYwXkEyXkFqcGdeQXVyNjAwNDUxODI@._V1_SX300.jpg' },
];

async function main() {
  const adminEmail = 'admin@cinemavault.com';
  const demoEmail = 'demo@cinemavault.com';

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      username: 'Admin',
      passwordHash: await bcrypt.hash('admin123', 12),
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: {
      email: demoEmail,
      username: 'DemoUser',
      passwordHash: await bcrypt.hash('demo123', 12),
      role: 'USER',
    },
  });

  for (const movie of sampleMovies) {
    const existing = await prisma.movie.findFirst({ where: { title: movie.title } });
    if (!existing) {
      await prisma.movie.create({ data: movie });
    }
  }

  console.log('Seed complete: admin@cinemavault.com / admin123, demo@cinemavault.com / demo123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
