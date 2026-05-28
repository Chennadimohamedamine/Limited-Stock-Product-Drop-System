import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../src/services/auth.service';

const prisma = new PrismaClient();

describe('Reservation Expiry and Lifecycle Restrictions', () => {
  let userId: string;
  let token: string;
  let productId: string;

  beforeAll(async () => {
    await prisma.inventoryLog.deleteMany();
    await prisma.order.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();

    const user = await prisma.user.create({
      data: { email: 'expiry@test.com', password: 'hashed_password' }
    });
    userId = user.id;
    token = generateToken(userId);

    const product = await prisma.product.create({
      data: { name: 'Item', description: 'desc', totalStock: 10, price: 100, reservedStock: 0 }
    });
    productId = product.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should reject checking out an expired reservation', async () => {
    const expiredReservation = await prisma.reservation.create({
      data: {
        userId,
        productId,
        quantity: 2,
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 1000) 
      }
    });

    const res = await request(app)
      .post('/api/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ reservationId: expiredReservation.id });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Reservation expired');
  });
});