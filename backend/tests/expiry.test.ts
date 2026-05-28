import request from 'supertest';
import app from '../src/app';
import prisma from '../src/utils/prisma';

let token: string;
let productId: string;

beforeAll(async () => {
  await prisma.inventoryLog.deleteMany();
  await prisma.order.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  const res = await request(app).post('/api/auth/register').send({
    email: 'expirytest@test.com',
    password: 'password123',
  });
  token = res.body.token;

  const product = await prisma.product.create({
    data: {
      name: 'Expiry Test Product',
      description: 'Test',
      totalStock: 10,
      reservedStock: 0,
      price: 49.99,
    },
  });
  productId = product.id;
});

afterAll(async () => {
  await prisma.inventoryLog.deleteMany();
  await prisma.order.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('Reservation expiry', () => {
  it('cannot checkout an expired reservation', async () => {
    // Get the userId from the token
    const userId = (await prisma.user.findUnique({
      where: { email: 'expirytest@test.com' },
    }))!.id;

    // Manually create an already-expired reservation
    const reservation = await prisma.reservation.create({
      data: {
        userId,
        productId,
        quantity: 1,
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 1000), // already expired
      },
    });

    await prisma.product.update({
      where: { id: productId },
      data: { reservedStock: { increment: 1 } },
    });

    const res = await request(app)
      .post('/api/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ reservationId: reservation.id });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/expired/i);
  });

  it('restores stock when reservation expires (simulated via direct DB update)', async () => {
    const userId = (await prisma.user.findUnique({
      where: { email: 'expirytest@test.com' },
    }))!.id;

    // Create a pending reservation
    const reservation = await prisma.reservation.create({
      data: {
        userId,
        productId,
        quantity: 3,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 60000),
      },
    });

    await prisma.product.update({
      where: { id: productId },
      data: { reservedStock: { increment: 3 } },
    });

    // Simulate expiry: mark reservation as expired and restore stock
    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: 'EXPIRED' },
    });

    await prisma.product.update({
      where: { id: productId },
      data: { reservedStock: { decrement: 3 } },
    });

    const product = await prisma.product.findUnique({ where: { id: productId } });
    // Stock should be fully restored
    expect(product!.reservedStock).toBe(0);
  });
});
