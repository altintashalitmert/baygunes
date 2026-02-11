import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@pbms.com' },
    update: {},
    create: {
      email: 'admin@pbms.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      name: 'System Admin',
      phone: '+90 555 000 00 00',
      active: true,
    },
  });

  console.log('✅ Admin user created:', admin.email);

  // Create default pricing config
  const pricingConfigs = [
    { key: 'print_price', value: 500.00, unit: 'TL' },
    { key: 'mount_price', value: 200.00, unit: 'TL' },
    { key: 'dismount_price', value: 150.00, unit: 'TL' },
    { key: 'vat_rate', value: 20.00, unit: '%' },
  ];

  for (const config of pricingConfigs) {
    await prisma.pricingConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }

  console.log('✅ Pricing config created');

  // Create sample poles (optional - for testing)
  const samplePoles = [
    {
      poleCode: 'ISKADB01',
      latitude: 41.0082,
      longitude: 28.9784,
      city: 'Istanbul',
      district: 'Kadıköy',
      neighborhood: 'Acıbadem',
      street: 'Bağdat Caddesi',
      sequenceNo: 1,
      status: 'AVAILABLE',
    },
    {
      poleCode: 'ISBEDC02',
      latitude: 41.0431,
      longitude: 29.0100,
      city: 'Istanbul',
      district: 'Beşiktaş',
      neighborhood: 'Etiler',
      street: 'Nispetiye Caddesi',
      sequenceNo: 2,
      status: 'AVAILABLE',
    },
  ];

  for (const pole of samplePoles) {
    await prisma.pole.upsert({
      where: { poleCode: pole.poleCode },
      update: {},
      create: pole,
    });
  }

  console.log('✅ Sample poles created');

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
