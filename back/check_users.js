const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    await prisma.$connect();
    const users = await prisma.usuario.findMany({
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        slug: true,
        estado: true
      }
    });
    console.table(users);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
