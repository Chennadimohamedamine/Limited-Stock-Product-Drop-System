import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../src/services/auth.service';

const prisma = new PrismaClient();

describe('High-Concurrency Stress Testing under Race Conditions', () => {
  let token: string;
  let productId: string;

  beforeAll(async () => {
    await prisma.inventoryLog.deleteMany();
    await prisma.order.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();

    const user = await prisma.user.create({
      data: { email: 'concurrency@test.com', password: 'hashed_password' }
    });
    token = generateToken(user.id);

    const product = await prisma.product.create({
      data: { name: 'Exclusive Drops', description: 'desc', totalStock: 10, price: 50 }
    });
    productId = product.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('only 10 of 100 concurrent requests should succeed', async () => {
    const requests = Array.from({ length: 100 }, () =>
      request(app)
        .post('/api/reserve')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId, quantity: 1 })
    );

    const results = await Promise.all(requests);
    const successful = results.filter(r => r.status === 201);
    const failed = results.filter(r => r.status === 409);

    expect(successful.length).toBe(10);
    expect(failed.length).toBe(90);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product?.reservedStock).toBe(10);
  });
});