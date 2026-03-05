const prisma = require('../prisma/client');
const dayjs = require('dayjs');

// --- PERFIL ---
exports.getDoctorProfile = async (req, res) => {
  try {
    const usuario_id = req.usuario.id;
    const profile = await prisma.usuario.findUnique({
      where: { id: usuario_id },
      select: {
         id: true, nombres: true, apellidos: true, email: true, picture: true,
         slug: true, specialty: true, bio: true, address: true, timezone: true,
         price: true, depositPercent: true, appointmentDurationMinutes: true
      }
    });
    if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' });
    res.json(profile);
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

exports.updateDoctorProfile = async (req, res) => {
  try {
    const usuario_id = req.usuario.id;
    const { slug, specialty, bio, address, timezone, price, depositPercent, appointmentDurationMinutes } = req.body;
    
    // Si envían slug, validar unicidad
    if (slug) {
        const exist = await prisma.usuario.findFirst({ where: { slug, id: { not: usuario_id } }});
        if (exist) return res.status(400).json({ error: 'El slug/enlace ya está en uso por otro doctor.' });
    }

    const updated = await prisma.usuario.update({
      where: { id: usuario_id },
      data: { slug, specialty, bio, address, timezone, price, depositPercent, appointmentDurationMinutes }
    });
    
    res.json(updated);
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
}

// --- DISPONIBILIDAD (REGLAS Y EXCEPCIONES) ---
exports.getAvailabilityRules = async (req, res) => {
  try {
    const rules = await prisma.availabilityRule.findMany({ where: { usuario_id: req.usuario.id }});
    res.json(rules);
  } catch(e) { res.status(500).json({ error: 'Error interno' }); }
}

exports.createAvailabilityRule = async (req, res) => {
  try {
    const { dayOfWeek, startTime, endTime } = req.body;
    if (dayOfWeek < 0 || dayOfWeek > 6 || !startTime || !endTime) {
        return res.status(400).json({ error: 'Datos de regla inválidos' });
    }
    const rule = await prisma.availabilityRule.create({
      data: { usuario_id: req.usuario.id, dayOfWeek, startTime, endTime }
    });
    res.status(201).json(rule);
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Error creando regla' });
  }
}

exports.deleteAvailabilityRule = async (req, res) => {
   try {
     const rule = await prisma.availabilityRule.findFirst({ where: { id: Number(req.params.id), usuario_id: req.usuario.id }});
     if(!rule) return res.status(404).json({ error: 'No autorizado' });
     await prisma.availabilityRule.delete({ where: { id: rule.id } });
     res.json({ success: true });
   } catch(e) { res.status(500).json({ error: 'Error interno' }); }
}


exports.getAvailabilityExceptions = async (req, res) => {
  try {
    const exceptions = await prisma.availabilityException.findMany({ 
        where: { usuario_id: req.usuario.id },
        orderBy: { date: 'asc' }
    });
    res.json(exceptions);
  } catch(e) { res.status(500).json({ error: 'Error interno' }); }
}

exports.createAvailabilityException = async (req, res) => {
  try {
    const { date, startTime, endTime, type, description } = req.body;
    if (!date || !type) return res.status(400).json({ error: 'Falta date o type' });

    // date debe ser YYYY-MM-DD local, lo guardamos como Date a las 00:00:00Z en Prisma
    const [year, month, day] = date.split('-');
    const dateObj = new Date(Date.UTC(year, month - 1, day));

    const exc = await prisma.availabilityException.create({
      data: { 
          usuario_id: req.usuario.id, 
          date: dateObj, 
          startTime: startTime || null, 
          endTime: endTime || null, 
          type, 
          description 
      }
    });
    res.status(201).json(exc);
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Error creando excepción' });
  }
}

exports.deleteAvailabilityException = async (req, res) => {
   try {
     const exc = await prisma.availabilityException.findFirst({ where: { id: Number(req.params.id), usuario_id: req.usuario.id }});
     if(!exc) return res.status(404).json({ error: 'No autorizado' });
     await prisma.availabilityException.delete({ where: { id: exc.id } });
     res.json({ success: true });
   } catch(e) { res.status(500).json({ error: 'Error interno' }); }
}

// --- MÉTRICAS (MVP) ---
exports.getDashboardMetrics = async (req, res) => {
  try {
    const usuario_id = req.usuario.id;
    const now = dayjs();
    const startOfMonth = now.startOf('month').toDate();
    const endOfMonth = now.endOf('month').toDate();

    // 1. Turnos Confirmados este Mes
    const confirmados = await prisma.turno.count({
      where: {
        usuario_id,
        estado: 'CONFIRMED',
        inicio: { gte: startOfMonth, lte: endOfMonth }
      }
    });

    // 2. Ingresos por Seña Aprobados este mes
    const pagosMes = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { 
          usuario_id, 
          status: 'APPROVED',
          paidAt: { gte: startOfMonth, lte: endOfMonth } 
      }
    });

    // 3. Cancelaciones del mes
    const cancelados = await prisma.turno.count({
      where: {
        usuario_id,
        estado: { in: ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_DOCTOR'] },
        updated_at: { gte: startOfMonth, lte: endOfMonth }
      }
    });

    res.json({
       mesActual: now.format('YYYY-MM'),
       turnosConfirmados: confirmados,
       ingresosSenaDepositados: pagosMes._sum.amount || 0,
       turnosCancelados: cancelados
    });

  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Error calculando métricas' });
  }
}
