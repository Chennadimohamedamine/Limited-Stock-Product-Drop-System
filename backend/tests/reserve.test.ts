import request from 'supertest';
import app from '../src/app';
import prisma from '../src/utils/prisma';
import bcrypt from 'bcryptjs';

let token: string;
let productId: string;

beforeAll(async () => {
  // Clean DB
  await prisma.inventoryLog.deleteMany();
  await prisma.order.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  // Create user and get token
  const res = await request(app).post('/api/auth/register').send({
    email: 'reservetest@test.com',
    password: 'password123',
  });
  token = res.body.token;

  // Create product
  const product = await prisma.product.create({
    data: {
      name: 'Test Product',
      description: 'Test',
      totalStock: 5,
      reservedStock: 0,
      price: 99.99,
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

describe('POST /api/reserve', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post('/api/reserve')
      .send({ productId, quantity: 1 });
    expect(res.status).toBe(401);
  });

  it('successfully creates a reservation and decrements available stock', async () => {
    const res = await request(app)
      .post('/api/reserve')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 2 });

    expect(res.status).toBe(201);
    expect(res.body.reservationId).toBeDefined();
    expect(res.body.expiresAt).toBeDefined();

    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product!.reservedStock).toBe(2);
  });

  it('returns 409 when requesting more stock than available', async () => {
    // 5 total - 2 reserved = 3 available, requesting 10 should fail
    const res = await request(app)
      .post('/api/reserve')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 10 });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/insufficient stock/i);
  });

  it('returns 400 for invalid input', async () => {
    const res = await request(app)
      .post('/api/reserve')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: '', quantity: 0 });

    expect(res.status).toBe(400);
  });
});
