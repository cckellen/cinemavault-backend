import express from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = express.Router();

const messageSchema = z.object({
  content: z.string().min(1).max(2000),
  movieId: z.string().uuid().optional(),
});

const replySchema = z.object({
  content: z.string().min(1).max(2000),
});

function formatMessage(msg: {
  id: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
  movieId: string | null;
  fromUser: { id: string; username: string | null; email: string };
  toUser: { id: string; username: string | null; email: string };
  movie?: { id: string; title: string } | null;
}) {
  return {
    id: msg.id,
    content: msg.content,
    isRead: msg.isRead,
    createdAt: msg.createdAt,
    movieId: msg.movieId,
    movie: msg.movie,
    from: msg.fromUser.username || msg.fromUser.email,
    to: msg.toUser.username || msg.toUser.email,
    fromUser: msg.fromUser,
    toUser: msg.toUser,
  };
}

async function findAdmin() {
  return prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
}

router.use(authenticateToken);

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { content, movieId } = messageSchema.parse(req.body);
    const admin = await findAdmin();
    if (!admin) return res.status(503).json({ error: 'No administrator available' });

    const message = await prisma.message.create({
      data: {
        fromUserId: req.user!.id,
        toUserId: admin.id,
        content,
        movieId,
      },
      include: {
        fromUser: true,
        toUser: true,
        movie: { select: { id: true, title: true } },
      },
    });
    res.status(201).json(formatMessage(message));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid message';
    res.status(400).json({ error: message });
  }
});

router.get('/', async (req: AuthRequest, res) => {
  const isAdmin = req.user!.role === 'ADMIN';
  const messages = await prisma.message.findMany({
    where: isAdmin
      ? {}
      : { OR: [{ fromUserId: req.user!.id }, { toUserId: req.user!.id }] },
    include: {
      fromUser: true,
      toUser: true,
      movie: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(messages.map(formatMessage));
});

router.post('/:id/reply', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { content } = replySchema.parse(req.body);
    const original = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!original) return res.status(404).json({ error: 'Message not found' });

    const reply = await prisma.message.create({
      data: {
        fromUserId: req.user!.id,
        toUserId: original.fromUserId,
        content,
        movieId: original.movieId,
      },
      include: {
        fromUser: true,
        toUser: true,
        movie: { select: { id: true, title: true } },
      },
    });

    await prisma.message.update({ where: { id: original.id }, data: { isRead: true } });
    res.status(201).json(formatMessage(reply));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Reply failed';
    res.status(400).json({ error: message });
  }
});

router.delete('/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    await prisma.message.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: 'Message not found' });
  }
});

export default router;
