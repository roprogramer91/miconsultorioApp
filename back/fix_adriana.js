const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setAdrianaSlug() {
  try {
    const dra = await prisma.usuario.findFirst({
      where: { nombres: { contains: 'Adriana' } }
    });
    
    if (dra) {
       await prisma.usuario.update({
         where: { id: dra.id },
         data: { slug: 'AdrianaNoguera' }
       });
       console.log('EXITO: Slug AdrianaNoguera asignado.');
    } else {
       console.log('No se encontro a Adriana en la BD.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

setAdrianaSlug();
