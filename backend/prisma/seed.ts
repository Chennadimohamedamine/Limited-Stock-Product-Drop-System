import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.inventoryLog.deleteMany();
  await prisma.order.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  // Create test users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const user1 = await prisma.user.create({
    data: { email: 'test@test.com', password: hashedPassword },
  });

  const user2 = await prisma.user.create({
    data: { email: 'user2@test.com', password: hashedPassword },
  });

  console.log('✅ Created users:', user1.email, user2.email);

  // Create products
  const product1 = await prisma.product.create({
    data: {
      name: 'Limited Edition Sneakers',
      description: 'Exclusive drop — only 10 pairs available worldwide.',
      totalStock: 10,
      reservedStock: 0,
      price: 299.99,
    },
  });

  const product2 = await prisma.product.create({
    data: {
      name: 'Rare Graphic Tee',
      description: 'Artist collaboration. 50 units only.',
      totalStock: 50,
      reservedStock: 0,
      price: 79.99,
    },
  });

  console.log('✅ Created products:', product1.name, product2.name);
  console.log('🎉 Seeding complete!');
  console.log('\n--- TEST CREDENTIALS ---');
  console.log('Email: test@test.com');
  console.log('Password: password123');
  console.log(`Product ID (stock=10): ${product1.id}`);
  console.log(`Product ID (stock=50): ${product2.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
