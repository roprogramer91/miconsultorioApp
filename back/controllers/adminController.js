const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// POST /api/admin/landing-config
exports.updateLandingConfig = async (req, res) => {
  try {
    const { username, password, slug, config } = req.body;
    
    // Auth Protegida y Manual según requerimiento
    if (username !== 'ramirez91' || password !== 'Inicio24$') {
      return res.status(401).json({ error: 'Credenciales de Super Administrador inválidas.' });
    }

    if (!slug || !config) {
      return res.status(400).json({ error: 'Faltan datos obligatorios (slug o config).' });
    }

    // Buscar al usuario
    const doctor = await prisma.usuario.findUnique({ where: { slug } });
    
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor no encontrado con ese slug.' });
    }

    // Actualizar o crear (Upsert) el LandingConfig
    const updatedConfig = await prisma.landingConfig.upsert({
      where: { usuario_id: doctor.id },
      create: {
        usuario_id: doctor.id,
        primaryColor: config.primaryColor || '#00B4D8',
        backgroundColor: config.backgroundColor || '#F8FBFF',
        textColor: config.textColor || '#1F2937',
        heroTitle: config.heroTitle || 'Cuidamos tu salud en tiempos difíciles',
        heroSubtitle: config.heroSubtitle || '',
        logoUrl: config.logoUrl || null,
        heroImageUrl: config.heroImageUrl || null,
      },
      update: {
        primaryColor: config.primaryColor,
        backgroundColor: config.backgroundColor,
        textColor: config.textColor,
        heroTitle: config.heroTitle,
        heroSubtitle: config.heroSubtitle,
        logoUrl: config.logoUrl,
        heroImageUrl: config.heroImageUrl,
      }
    });

    res.json({ success: true, message: 'Landing web del Doctor actualizada exitosamente.', config: updatedConfig });

  } catch (error) {
    console.error('[Admin] Error en updateLandingConfig:', error);
    res.status(500).json({ error: 'Error del servidor al guardar la plantilla.' });
  }
};
