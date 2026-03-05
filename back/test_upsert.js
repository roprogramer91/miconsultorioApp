require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['query', 'error', 'warn'] });

async function main() {
    console.log('Conectando a Railway...');
    
    try {
        const count = await prisma.usuario.count();
        console.log('✅ Conexion OK. Usuarios en BD:', count);
        
        const doc = await prisma.usuario.findFirst({ where: { slug: 'cosmefulano' }, select: { id: true } });
        if (doc) {
            console.log('✅ Doctor encontrado con id:', doc.id);
            const result = await prisma.landingConfig.upsert({
                where: { usuario_id: doc.id },
                update: { obrasSociales: ['OSDE', 'IOMA'], especialidades: [{ titulo: 'Cardiologia', descripcion: 'Test', items: ['Holter'] }] },
                create: { usuario_id: doc.id, obrasSociales: ['OSDE', 'IOMA'], especialidades: [{ titulo: 'Cardiologia', descripcion: 'Test', items: ['Holter'] }] }
            });
            console.log('✅ Upsert OK:', JSON.stringify({ obrasSociales: result.obrasSociales, especialidades: result.especialidades }));
        } else {
            console.log('❌ Doctor cosmefulano no encontrado');
        }
    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
