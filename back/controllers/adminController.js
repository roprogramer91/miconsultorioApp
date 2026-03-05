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

// POST /api/admin/doctors
exports.createDoctor = async (req, res) => {
  try {
    const { username, password, email, nombres, apellidos, slug } = req.body;
    
    if (username !== 'ramirez91' || password !== 'Inicio24$') {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    if (!email || !nombres || !apellidos || !slug) {
      return res.status(400).json({ error: 'Faltan datos obligatorios para crear el doctor.' });
    }

    // Verificar si el slug ya está en uso
    const existingSlug = await prisma.usuario.findUnique({ where: { slug } });
    if (existingSlug) {
      return res.status(400).json({ error: 'El ID / Slug ya está en uso. Elige otro.' });
    }

    // Verificar si el email ya existe en DB
    const existingUser = await prisma.usuario.findUnique({ where: { email } });
    
    if (existingUser) {
        // En un caso extremo que exista pero no tenga el slug que queremos, lo actualizamos.
        const updatedUser = await prisma.usuario.update({
            where: { id: existingUser.id },
            data: {
                slug,
                nombres,
                apellidos,
                estado: 'ACTIVO'
            }
        });
        return res.json({ success: true, message: 'Usuario existente actualizado y vinculado al nuevo Slug.', doctor: updatedUser });
    }

    // Crear el doctor desde cero
    const newDoctor = await prisma.usuario.create({
      data: {
        email,
        nombres,
        apellidos,
        slug,
        estado: 'ACTIVO'
      }
    });

    res.status(201).json({ success: true, message: '¡Doctor dado de alta exitosamente!', doctor: newDoctor });

  } catch (error) {
    console.error('[Admin] Error en createDoctor:', error);
    res.status(500).json({ error: 'Error del servidor al dar de alta al doctor.' });
  }
};
