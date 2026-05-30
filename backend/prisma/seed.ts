import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');


  await prisma.inventoryLog.deleteMany();
  await prisma.order.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();


  const hashedPassword = await bcrypt.hash('amine@ronaldo21', 10);

  const user1 = await prisma.user.create({
    data: { email: 'mohamedamine@test.com', password: hashedPassword },
  });

  const user2 = await prisma.user.create({
    data: { email: 'user2@test.com', password: hashedPassword },
  });

  console.log(' Created users:', user1.email, user2.email);

  // Create products
  const product1 = await prisma.product.create({
    data: {
      name: 'Limited Edition Sneakers',
      description: 'Exclusive drop — only 10 pairs available worldwide.',
      totalStock: 2,
      reservedStock: 0,
      price: 299.99,
    },
  });

  const product2 = await prisma.product.create({
    data: {
      name: 'Rare Graphic Tee',
      description: 'Artist collaboration. 5 units only.',
      totalStock: 5,
      reservedStock: 0,
      price: 79.99,
    },
  });

  console.log('Created products:', product1.name, product2.name);
  console.log(' Seeding complete!');
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
