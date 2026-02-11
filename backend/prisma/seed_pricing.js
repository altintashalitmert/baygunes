
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const defaults = [
    { key: 'print_price_sqm', value: 500, unit: 'TL' },
    { key: 'mount_price', value: 200, unit: 'TL' },
    { key: 'dismount_price', value: 150, unit: 'TL' },
  ];

  console.log('Seeding pricing config...');

  for (const item of defaults) {
    await prisma.pricingConfig.upsert({
      where: { key: item.key },
      update: {},
      create: {
        key: item.key,
        value: item.value,
        unit: item.unit
      },
    });
  }

  console.log('Pricing config seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
