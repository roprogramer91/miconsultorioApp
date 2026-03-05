const prisma = require('../prisma/client');

exports.renderLanding = async (req, res) => {
  try {
    const { slug } = req.params;

    if (slug === 'favicon.ico' || slug === 'api' || slug === 'public' || slug === 'admin' || slug === 'auth' || slug === 'css' || slug === 'js') {
        return res.status(404).send();
    }

    const doctor = await prisma.usuario.findFirst({
      where: { 
        slug: { equals: slug, mode: 'insensitive' }
      },
      select: {
        id: true,
        slug: true,
        nombres: true,
        apellidos: true,
        picture: true,
        specialty: true,
        bio: true,
        address: true,
        price: true,
        depositPercent: true,
        appointmentDurationMinutes: true,
        timezone: true,
        estado: true,
        landingConfig: true
      }
    });

    if (!doctor) {
      return res.status(404).send('<div style="font-family: sans-serif; text-align: center; margin-top: 50px;"><h1>404</h1><p>El profesional médico solicitado no existe o la URL es incorrecta.</p></div>');
    }

    if (doctor.estado !== 'ACTIVO') {
      return res.status(403).send('<div style="font-family: sans-serif; text-align: center; margin-top: 50px;"><h1>Perfil Inactivo</h1><p>Este profesional médico no se encuentra aceptando reservas actualmente.</p></div>');
    }

    // Config default fallback
    const raw = doctor.landingConfig || {};
    console.log('[DEBUG] landingConfig RAW:', JSON.stringify(raw, null, 2));
    
    const config = {
        primaryColor: raw.primaryColor || '#2563EB',
        backgroundColor: raw.backgroundColor || '#f5f5f5',
        textColor: raw.textColor || '#111827',
        heroTitle: raw.heroTitle || null,
        heroSubtitle: raw.heroSubtitle || null,
        profileImageUrl: raw.profileImageUrl || doctor.picture || null,
        avatarUrl: raw.profileImageUrl || doctor.picture || null,
        whatsappNumber: raw.whatsappNumber || null,
        especialidades: Array.isArray(raw.especialidades) ? raw.especialidades : [],
        obrasSociales: Array.isArray(raw.obrasSociales) ? raw.obrasSociales : [],
        facebookUrl: raw.facebookUrl || null,
        instagramUrl: raw.instagramUrl || null,
    };

    console.log('[DEBUG] config procesado:', JSON.stringify(config, null, 2));

    const appWebUrl = process.env.APP_WEB_URL || 'http://localhost:8081';
    res.render('plantilla_medico', { doctor, config, appWebUrl });

  } catch (error) {
    console.error('Error en renderLanding:', error);
    res.status(500).send('Error interno del servidor.');
  }
};
