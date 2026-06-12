import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

router.post('/avatar', authenticateToken, upload.single('avatar'), async (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { avatarUrl },
  });

  res.json({
    avatarUrl: user.avatarUrl,
    avatar: user.avatarUrl,
    message: 'Avatar uploaded successfully',
  });
});

export default router;
