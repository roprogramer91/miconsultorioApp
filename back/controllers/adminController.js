const prisma = require('../prisma/client');

// POST /api/admin/landing-config
exports.updateLandingConfig = async (req, res) => {
  try {
    const { username, password, slug, config } = req.body;

    if (username !== 'ramirez91' || password !== 'Inicio24$') {
      return res.status(401).json({ error: 'Credenciales de Super Administrador inválidas.' });
    }

    if (!slug || !config) {
      return res.status(400).json({ error: 'Faltan datos obligatorios (slug o config).' });
    }

    // Buscar el doctor con SQL directo (más rápido, no usa ORM)
    const doctors = await prisma.$queryRaw`
      SELECT id FROM usuarios WHERE LOWER(slug) = LOWER(${slug}) LIMIT 1
    `;

    if (!doctors || doctors.length === 0) {
      return res.status(404).json({ error: `Doctor con slug '${slug}' no encontrado.` });
    }

    const doctorId = parseInt(doctors[0].id);

    const obrasSociales = Array.isArray(config.obrasSociales) ? config.obrasSociales : [];
    const especialidades = Array.isArray(config.especialidades) ? config.especialidades : [];

    const obrasSocialesJson = JSON.stringify(obrasSociales);
    const especialidadesJson = JSON.stringify(especialidades);
    const primaryColor    = config.primaryColor    || '#b00000';
    const backgroundColor = config.backgroundColor || '#f5f5f5';
    const textColor       = config.textColor       || '#333333';
    const heroTitle       = config.heroTitle       || 'Atención Profesional de Calidad';
    const heroSubtitle    = config.heroSubtitle    || '';
    const logoUrl         = config.logoUrl         || null;
    const heroImageUrl    = config.heroImageUrl    || null;
    const profileImageUrl = config.profileImageUrl || null;
    const whatsappNumber  = config.whatsappNumber  || null;
    const facebookUrl     = config.facebookUrl     || null;
    const instagramUrl    = config.instagramUrl    || null;

    // Upsert con SQL directo — no depende del ORM overhead
    await prisma.$executeRaw`
      INSERT INTO landing_configs (
        usuario_id, "primaryColor", "backgroundColor", "textColor",
        "heroTitle", "heroSubtitle", "logoUrl", "heroImageUrl",
        "profileImageUrl", "whatsappNumber", "facebookUrl", "instagramUrl",
        "obrasSociales", "especialidades"
      )
      VALUES (
        ${doctorId}, ${primaryColor}, ${backgroundColor}, ${textColor},
        ${heroTitle}, ${heroSubtitle}, ${logoUrl}, ${heroImageUrl},
        ${profileImageUrl}, ${whatsappNumber}, ${facebookUrl}, ${instagramUrl},
        ${obrasSocialesJson}::jsonb, ${especialidadesJson}::jsonb
      )
      ON CONFLICT (usuario_id) DO UPDATE SET
        "primaryColor"    = EXCLUDED."primaryColor",
        "backgroundColor" = EXCLUDED."backgroundColor",
        "textColor"       = EXCLUDED."textColor",
        "heroTitle"       = EXCLUDED."heroTitle",
        "heroSubtitle"    = EXCLUDED."heroSubtitle",
        "logoUrl"         = EXCLUDED."logoUrl",
        "heroImageUrl"    = EXCLUDED."heroImageUrl",
        "profileImageUrl" = EXCLUDED."profileImageUrl",
        "whatsappNumber"  = EXCLUDED."whatsappNumber",
        "facebookUrl"     = EXCLUDED."facebookUrl",
        "instagramUrl"    = EXCLUDED."instagramUrl",
        "obrasSociales"   = EXCLUDED."obrasSociales",
        "especialidades"  = EXCLUDED."especialidades"
    `;

    res.json({ success: true, message: 'Landing web del Doctor actualizada exitosamente.' });

  } catch (error) {
    console.error('[Admin] Error en updateLandingConfig:', error);
    res.status(500).json({ error: 'Error del servidor al guardar: ' + error.message });
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

    // Verificar duplicado de slug
    const existingSlug = await prisma.$queryRaw`SELECT id FROM usuarios WHERE LOWER(slug) = LOWER(${slug}) LIMIT 1`;
    if (existingSlug.length > 0) {
      return res.status(400).json({ error: 'El ID / Slug ya está en uso. Elige otro.' });
    }

    // Verificar email existente
    const existingUser = await prisma.$queryRaw`SELECT id FROM usuarios WHERE email = ${email} LIMIT 1`;

    if (existingUser.length > 0) {
      const userId = parseInt(existingUser[0].id);
      await prisma.$executeRaw`UPDATE usuarios SET slug = ${slug}, nombres = ${nombres}, apellidos = ${apellidos}, estado = 'ACTIVO' WHERE id = ${userId}`;
      return res.json({ success: true, message: 'Usuario existente actualizado y vinculado al nuevo Slug.' });
    }

    await prisma.$executeRaw`INSERT INTO usuarios (email, nombres, apellidos, slug, estado) VALUES (${email}, ${nombres}, ${apellidos}, ${slug}, 'ACTIVO')`;

    res.status(201).json({ success: true, message: '¡Doctor dado de alta exitosamente!' });

  } catch (error) {
    console.error('[Admin] Error en createDoctor:', error);
    res.status(500).json({ error: 'Error del servidor al dar de alta al doctor: ' + error.message });
  }
};
