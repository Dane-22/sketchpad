import { prisma } from './src/config/db';

async function resetDb() {
  await prisma.project.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('Database reset successfully.');
}

resetDb().catch(console.error).finally(() => prisma.$disconnect());
