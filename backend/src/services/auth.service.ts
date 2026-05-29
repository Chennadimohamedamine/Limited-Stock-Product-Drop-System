import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

function generateToken(userId: string, email: string): string {
  if (!userId || !email) {
    throw new Error('Cannot generate token without userId and email');
  }
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' } as jwt.SignOptions
  );
}

export async function register(email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('Email already registered', 409);

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashed },
    select: { id: true, email: true, createdAt: true },
  });

  if (!user.id) {
    throw new AppError('Failed to create user', 500);
  }

  const token = generateToken(user.id, user.email);
  
  logger.info({
    message: 'User registered',
    userId: user.id,
    email: user.email,
  });

  return { 
    token, 
    user: { id: user.id, email: user.email, createdAt: user.createdAt }
  };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('Invalid email or password', 401);

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new AppError('Invalid email or password', 401);

  if (!user.id) {
    throw new AppError('User has no ID', 500);
  }

  const token = generateToken(user.id, user.email);
  
  logger.info({
    message: 'User logged in',
    userId: user.id,
    email: user.email,
  });

  return {
    token,
    user: { id: user.id, email: user.email, createdAt: user.createdAt },
  };
}