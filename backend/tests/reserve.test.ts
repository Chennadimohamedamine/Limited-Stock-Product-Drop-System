import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../src/services/auth.service';

const prisma = new PrismaClient();

describe('Reservation System Flow and Boundary Conditions', () => {
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
      data: { email: 'reserve@test.com', password: 'hashed_password' }
    });
    userId = user.id;
    token = generateToken(userId);

    const product = await prisma.product.create({
      data: { name: 'Test Box', description: 'desc', totalStock: 5, price: 10 }
    });
    productId = product.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should return 401 when request is unauthenticated', async () => {
    const res = await request(app)
      .post('/api/reserve')
      .send({ productId, quantity: 1 });
    expect(res.status).toBe(401);
  });

  it('should create successful reservation and reduce available stock', async () => {
    const res = await request(app)
      .post('/api/reserve')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 2 });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('reservationId');

    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product?.reservedStock).toBe(2);
  });

  it('should prevent excess execution reservation and return 409 when insufficient stock remains', async () => {
    const res = await request(app)
      .post('/api/reserve')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 5 });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Insufficient stock');
  });
});