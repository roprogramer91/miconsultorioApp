const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSlugs() {
  await prisma.$connect();
  const usuarios = await prisma.usuario.findMany({ where: { rol: 'MEDICO' }});
  
  for (const u of usuarios) {
    if (!u.slug) {
      const gSlug = `${u.nombres.replace(/\s+/g,'')}${u.apellidos.replace(/\s+/g,'')}`;
      console.log(`Asignando slug ${gSlug} a ${u.nombres} ${u.apellidos}`);
      await prisma.usuario.update({
        where: { id: u.id },
        data: { slug: gSlug }
      });
    } else {
        console.log(`${u.nombres} ya tiene slug: ${u.slug}`);
    }
  }
  await prisma.$disconnect();
}
fixSlugs();
