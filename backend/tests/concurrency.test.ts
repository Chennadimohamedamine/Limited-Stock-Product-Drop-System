import request from 'supertest';
import app from '../src/app';
import prisma from '../src/utils/prisma';

const STOCK = 10;
const CONCURRENT_USERS = 100;
// Unique run ID so test can be re-run without conflicts
const RUN_ID = Date.now();

let tokens: string[] = [];
let productId: string;

beforeAll(async () => {
  // Clean only this test's data via unique email prefix
  await prisma.inventoryLog.deleteMany();
  await prisma.order.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany({
    where: { email: { contains: `concurrent_${RUN_ID}` } },
  });

  console.log(`Creating ${CONCURRENT_USERS} test users (run=${RUN_ID})...`);

  // Create users sequentially to avoid unique-constraint races on registration
  tokens = [];
  for (let i = 0; i < CONCURRENT_USERS; i++) {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: `concurrent_${RUN_ID}_${i}@test.com`,
        password: 'password123',
      });

    // Allow 429 (rate limit) and retry with delay
    if (res.status === 429) {
      console.log(`Rate limited at user ${i}, waiting...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const retryRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: `concurrent_${RUN_ID}_${i}@test.com`,
          password: 'password123',
        });
      
      if (retryRes.status !== 201) {
        throw new Error(`Failed to register user ${i} after retry: ${JSON.stringify(retryRes.body)}`);
      }
      tokens.push(retryRes.body.token as string);
    } else if (res.status !== 201) {
      throw new Error(`Failed to register user ${i}: ${JSON.stringify(res.body)}`);
    } else {
      tokens.push(res.body.token as string);
    }
  }

  console.log(`${tokens.length} users registered`);

  // Create product with limited stock
  const product = await prisma.product.create({
    data: {
      name: 'Concurrency Test Product',
      description: 'Only 10 available',
      totalStock: STOCK,
      reservedStock: 0,
      price: 199.99,
    },
  });
  productId = product.id;
  console.log(`Product created — id=${productId} stock=${STOCK}`);
}, 180_000); // Increased timeout

afterAll(async () => {
  await prisma.inventoryLog.deleteMany();
  await prisma.order.deleteMany();
  await prisma.reservation.deleteMany({ where: { productId } });
  await prisma.product.deleteMany({ where: { id: productId } });
  await prisma.user.deleteMany({
    where: { email: { contains: `concurrent_${RUN_ID}` } },
  });
  await prisma.$disconnect();
});

describe('Concurrency — race condition prevention', () => {
  it(
    `only ${STOCK} of ${CONCURRENT_USERS} concurrent requests should succeed`,
    async () => {
      console.log(`\nFiring ${CONCURRENT_USERS} simultaneous reservation requests...`);

      // All 100 hit /reserve at exactly the same moment
      const results = await Promise.all(
        tokens.map((token) =>
          request(app)
            .post('/api/reserve')
            .set('Authorization', `Bearer ${token}`)
            .send({ productId, quantity: 1 })
        )
      );

      const successful = results.filter((r) => r.status === 201);
      const failed = results.filter((r) => r.status === 409);
      const other = results.filter((r) => r.status !== 201 && r.status !== 409);

      console.log(`Successful (201): ${successful.length}`);
      console.log(`Failed (409):     ${failed.length}`);
      if (other.length) {
        console.log(`⚠  Other statuses:  ${other.length}`);
        other.slice(0, 3).forEach((r) => console.log(`   ${r.status}:`, r.body));
      }

      // Core assertion: exactly STOCK reservations succeed — never more
      expect(successful.length).toBe(STOCK);
      expect(failed.length).toBe(CONCURRENT_USERS - STOCK);

      // DB must be consistent
      const product = await prisma.product.findUnique({ where: { id: productId } });
      expect(product!.reservedStock).toBe(STOCK);
      // Stock MUST NEVER go negative
      expect(product!.reservedStock).toBeLessThanOrEqual(product!.totalStock);

      const pendingCount = await prisma.reservation.count({
        where: { productId, status: 'PENDING' },
      });
      expect(pendingCount).toBe(STOCK);
    },
    180_000
  );
});