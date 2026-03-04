const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function update() {
  try {
    await prisma.$connect();
    console.log("Conectado a DB");
    const roger = await prisma.usuario.findFirst({
      where: {
        OR: [
          { nombres: { contains: 'Roger', mode: 'insensitive' } },
          { apellidos: { contains: 'Ramirez', mode: 'insensitive' } }
        ]
      }
    });
    
    if (roger) {
      await prisma.usuario.update({
        where: { id: roger.id },
        data: {
          slug: 'RogerRamirez',
          estado: 'ACTIVO',
          price: 20000,
          specialty: 'Medicina General',
          address: 'Clinica Miconsultorio, 2do Piso'
        }
      });
      console.log('Usuario Roger Ramirez actualizado a ACTIVO con slug: RogerRamirez');
    } else {
      console.log('No se encontro usuario Roger Ramirez');
    }
  } catch (err) {
    console.error("Error: ", err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}
update();
