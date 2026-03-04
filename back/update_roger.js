const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function update() {
  try {
    await prisma.$connect();
    console.log("Conectado a DB");
    const roger = await prisma.usuario.findFirst({
      where: {
        slug: 'RogerRamirez'
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
          address: 'Clinica Miconsultorio, 2do Piso',
          landingConfig: {
            upsert: {
              create: {
                primaryColor: '#00B4D8',
                backgroundColor: '#F8FBFF',
                textColor: '#1F2937',
                heroTitle: 'Cuidamos tu salud en tiempos difíciles',
                heroSubtitle: 'Atención personalizada y segura con el Dr. Ramirez.'
              },
              update: {
                primaryColor: '#00B4D8'
              }
            }
          }
        }
      });
      console.log('Usuario Roger Ramirez actualizado con LandingConfig');
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
