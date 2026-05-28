import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.inventoryLog.deleteMany();
  await prisma.order.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      email: 'test@test.com',
      password: hashedPassword,
    },
  });

  const p1 = await prisma.product.create({
    data: {
      name: 'Hype Drop Sneaker Gold',
      description: 'Ultra limited edition gold sneakers.',
      totalStock: 10,
      price: 199.99,
    },
  });

  const p2 = await prisma.product.create({
    data: {
      name: 'Cyberpunk Jacket 2026',
      description: 'Premium synthetic leather jacket with neon detailing.',
      totalStock: 50,
      price: 299.99,
    },
  });

  console.log({ message: 'Database seeded successfully', testUser: user.email, products: [p1.name, p2.name] });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });