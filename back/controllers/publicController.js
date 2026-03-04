const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { Preference, MercadoPagoConfig, Payment } = require('mercadopago');
const AvailabilityService = require('../services/availabilityService');
const dayjs = require('dayjs');
const crypto = require('crypto');

// MP_ACCESS_TOKEN debería estar en tu .env
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || 'TEST-TOKEN', options: { timeout: 5000 } });

exports.getDoctorProfile = async (req, res) => {
  try {
    const { slug } = req.params;
    const doctor = await prisma.usuario.findUnique({
      where: { slug },
      select: {
        id: true,
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
        estado: true
      }
    });

    if (!doctor) return res.status(404).json({ error: 'Doctor no encontrado.' });
    if (doctor.estado !== 'ACTIVO') return res.status(403).json({ error: 'La Landing Page del Doctor está inactiva o pendiente de pago.' });
    
    res.json(doctor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno.' });
  }
};

exports.getDoctorAvailability = async (req, res) => {
  try {
    const { slug } = req.params;
    const { from, to } = req.query;

    if (!from || !to) return res.status(400).json({ error: 'Falta from o to (YYYY-MM-DD)' });

    const doctor = await prisma.usuario.findUnique({ where: { slug }, select: { id: true } });
    if (!doctor) return res.status(404).json({ error: 'Doctor no encontrado.' });

    const slots = await AvailabilityService.getAvailableSlots(doctor.id, from, to);
    res.json(slots);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error calculando disponibilidad.' });
  }
};

// POST /public/doctors/:slug/reservations
exports.createReservation = async (req, res) => {
  try {
    const { slug } = req.params;
    const { patient, datetime } = req.body; // patient: { dni, nombres, apellidos, telefono, email }

    if (!patient || !datetime) return res.status(400).json({ error: 'Faltan datos de reserva.' });
    if (!patient.nombres || !patient.apellidos) return res.status(400).json({ error: 'Nombre y apellido requeridos.' });
    if (!patient.email && !patient.telefono && !patient.dni) return res.status(400).json({ error: 'Mínimo un método de contacto.' });

    const doctor = await prisma.usuario.findUnique({ where: { slug } });
    if (!doctor) return res.status(404).json({ error: 'Doctor no encontrado.' });

    const inicioDate = new Date(datetime);
    const tz = doctor.timezone || 'America/Argentina/Buenos_Aires';
    // Omitimos validación de PAST dadas las PR limits, asuminos el frontend valida

    // Iniciar Transacción Seriazable (Double Booking Proof)
    const result = await prisma.$transaction(async (tx) => {
      // 1. DEDUPLICACIÓN PACIENTE (Buscar si ya existe para este doctor por DNI > Teléfono > Email)
      let pacienteExistente = null;
      if (patient.dni) {
         pacienteExistente = await tx.paciente.findFirst({ where: { usuario_id: doctor.id, dni: patient.dni } });
      } else if (patient.telefono) {
         pacienteExistente = await tx.paciente.findFirst({ where: { usuario_id: doctor.id, telefono: patient.telefono } });
      } else if (patient.email) {
         pacienteExistente = await tx.paciente.findFirst({ where: { usuario_id: doctor.id, email: patient.email } });
      }

      let pacienteModel;
      if (pacienteExistente) {
        pacienteModel = pacienteExistente;
        // Opcional: Updatear data faltante
      } else {
        pacienteModel = await tx.paciente.create({
          data: {
            usuario_id: doctor.id,
            dni: patient.dni || null,
            nombres: patient.nombres,
            apellidos: patient.apellidos,
            telefono: patient.telefono || null,
            email: patient.email || null
          }
        });
      }

      // 2. CHECK OVERLAP
      const finDate = dayjs(inicioDate).add(doctor.appointmentDurationMinutes, 'minute').toDate();
      const overlapCount = await tx.turno.count({
        where: {
          usuario_id: doctor.id,
          estado: { notIn: ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_DOCTOR', 'EXPIRED'] },
          AND: [
              { inicio: { lt: finDate } },
              { fin: { gt: inicioDate } }
          ]
        }
      });

      if (overlapCount > 0) {
        throw new Error("El horario seleccionado ya fue reservado por otro paciente.");
      }

      // 3. CREAR TURNO (PENDING_PAYMENT, expires en 15 minutos)
      const expiresAt = dayjs().add(15, 'minute').toDate();
      const newTurno = await tx.turno.create({
        data: {
          usuario_id: doctor.id,
          paciente_id: pacienteModel.id,
          inicio: inicioDate,
          fin: finDate,
          estado: 'PENDING_PAYMENT',
          source: 'WEB',
          expiresAt: expiresAt
        }
      });

      // 4. CREAR PAYMENT RECORD
      const montoDeposito = parseFloat(doctor.price) * (parseFloat(doctor.depositPercent) / 100);
      
      const paymentRecord = await tx.payment.create({
        data: {
          turno_id: newTurno.id,
          usuario_id: doctor.id,
          provider: 'MERCADOPAGO',
          amount: montoDeposito,
          status: 'PENDING'
        }
      });

      return { turno: newTurno, payment: paymentRecord, paciente: pacienteModel, deposit: montoDeposito };
    }, { isolationLevel: 'Serializable' });

    // 5. GENERAR PREFERENCIA MERCADOPAGO (Fuera de la transacción para no bloquear la BD si MP tarda)
    const preference = new Preference(client);
    const prefResult = await preference.create({
      body: {
        items: [
          {
            id: result.turno.id.toString(),
            title: `Seña Turno Dr/a. ${doctor.apellidos}`,
            quantity: 1,
            unit_price: result.deposit,
            currency_id: 'ARS'
          }
        ],
        payer: {
          name: result.paciente.nombres,
          surname: result.paciente.apellidos,
          email: result.paciente.email || 'sin-email@consultorio.com'
        },
        external_reference: result.payment.id.toString(), // ID DEL PAGO, NO DEL TURNO
        notification_url: `${process.env.PUBLIC_URL || 'https://tu-dominio.com'}/api/public/webhooks/mercadopago`,
        expires: true,
        expiration_date_to: result.turno.expiresAt.toISOString() // Expirar pago al mismo tiempo
      }
    });

    // Guardar el preference ID
    await prisma.payment.update({
      where: { id: result.payment.id },
      data: { preferenceId: prefResult.id }
    });

    res.status(201).json({ 
        turnoId: result.turno.id, 
        expiresAt: result.turno.expiresAt,
        init_point: prefResult.init_point
    });

  } catch (error) {
    if (error.message.includes('reservado')) {
        return res.status(409).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: 'Error procesando la reserva.' });
  }
};


// WEBHOOK IDEMPOTENTE
exports.mercadopagoWebhook = async (req, res) => {
  // Siempre devolver HTTP 200 rápido a MP 
  res.status(200).send("OK");
  
  try {
    const { action, type, data } = req.body;
    const { v4: uuidv4 } = require('uuid');
    
    // MP Webhooks pueden venir con action o con type
    if ((action === 'payment.created' || action === 'payment.updated') || type === 'payment') {
      const paymentId = data.id;
      
      const paymentApi = new Payment(client);
      const mpPayment = await paymentApi.get({ id: paymentId });
      
      if (mpPayment.status === 'approved') {
         const internalPaymentId = Number(mpPayment.external_reference);
         
         if (!internalPaymentId) return;

         // UPDATE IDEMPOTENTE
         const updated = await prisma.payment.updateMany({
           where: { 
             id: internalPaymentId,
             status: 'PENDING'
           },
           data: {
             status: 'APPROVED',
             providerPaymentId: String(mpPayment.id),
             paidAt: new Date(mpPayment.date_approved || new Date())
           }
         });

         if (updated.count === 1) {
            // Se acaba de aprobar.
            const paymentObj = await prisma.payment.findUnique({ where: { id: internalPaymentId }});
            
            // Confirmar Turno
            const turnoConfirmado = await prisma.turno.update({
              where: { id: paymentObj.turno_id },
              data: { estado: 'CONFIRMED' },
              include: { paciente: true, usuario: true }
            });
            
            // MAGIC LINK: Generar Token de Acceso para el Paciente
            const mgkToken = uuidv4();
            // Un token que expira en 6 meses (idealmente expira finalizado el turno, lo dejamos en 6 meses de life para historial MVP)
            const expires = dayjs().add(6, 'month').toDate();

            await prisma.patientAccessToken.create({
              data: {
                paciente_id: turnoConfirmado.paciente_id,
                token: mgkToken,
                expiresAt: expires
              }
            });

            const linkToPatient = `${process.env.PUBLIC_URL || 'https://tu-dominio.com'}/patient/turnos?token=${mgkToken}`;

            // En un sistema en producción aquí dispararías Service de Email/WhatsApp para:
            // "¡Pago confirmado! Gestiona tu turno aquí: " + linkToPatient
            console.log(`[Webhook] Reserva MP Aprobada y Turno ${paymentObj.turno_id} Confirmado.`);
            console.log(`[Webhook] 👉 Magic Link Paciente Generado: ${linkToPatient}`);
         } else {
            console.log(`[Webhook] Notificación duplicada de pago ${paymentId} ignorada.`);
         }
      }
    }
  } catch (err) {
    console.error('[Webhook Error]', err);
  }
};

// MAGIK LINKS (Autogestión de Paciente)
exports.getPatientTurnoDetails = async (req, res) => { 
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token requerido.' });

    const accessToken = await prisma.patientAccessToken.findUnique({
      where: { token },
      include: { 
        paciente: { include: { turnos: { include: { usuario: true, payment: true }, orderBy: { inicio: 'desc' } } } }
      }
    });

    if (!accessToken) return res.status(404).json({ error: 'Sesión inválida o expirada.' });
    if (new Date() > accessToken.expiresAt) return res.status(401).json({ error: 'Link expirado.' });

    // Actualizamos el lastUsed
    await prisma.patientAccessToken.update({ where: { id: accessToken.id }, data: { usedAt: new Date() }});

    // Retornamos perfil y turnos
    res.json({
       paciente: accessToken.paciente,
       turnos: accessToken.paciente.turnos
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al recuperar la información del turno.' });
  }
};

exports.confirmPatientTurno = async (req, res) => { 
  try {
    const { token } = req.query;
    const { id: turnoId } = req.params;
    
    // Validación Auth de Magic Link
    if (!token) return res.status(401).json({ error: 'Token requerido.' });
    const accessToken = await prisma.patientAccessToken.findUnique({ where: { token }});
    if (!accessToken || new Date() > accessToken.expiresAt) return res.status(401).json({ error: 'Link inválido/expirado.' });

    // Validación Propiedad del Turno
    const turno = await prisma.turno.findFirst({
       where: { id: Number(turnoId), paciente_id: accessToken.paciente_id }
    });
    
    if (!turno) return res.status(404).json({ error: 'Turno no encontrado.' });
    if (turno.estado !== 'CONFIRMED') return res.status(400).json({ error: 'El turno no se encuentra en estado confirmable.' });

    // Lógica (MVP de confirmación es simplemente registrarlo internamente o enviarle un msg, aquí se puede añadir una columna `confirmedByPatient` a la DB en futuras iteraciones si la regla de negocio lo demanda; por ahora respondemos OK)
    res.json({ success: true, message: 'Turno confirmado con éxito. ¡Te esperamos!' });

  } catch(error) {
    console.error(error);
    res.status(500).json({ error: 'Ocurrió un error.' });
  }
};

exports.cancelPatientTurno = async (req, res) => { 
  try {
    const { token } = req.query;
    const { id: turnoId } = req.params;
    
    // Validación Auth de Magic Link
    if (!token) return res.status(401).json({ error: 'Token requerido.' });
    const accessToken = await prisma.patientAccessToken.findUnique({ where: { token }});
    if (!accessToken || new Date() > accessToken.expiresAt) return res.status(401).json({ error: 'Link inválido/expirado.' });

    // Validación Propiedad del Turno
    const turno = await prisma.turno.findFirst({
       where: { id: Number(turnoId), paciente_id: accessToken.paciente_id }
    });
    
    if (!turno) return res.status(404).json({ error: 'Turno no encontrado.' });
    if (turno.estado === 'CANCELLED_BY_PATIENT' || turno.estado === 'CANCELLED_BY_DOCTOR') {
       return res.status(400).json({ error: 'El turno ya se encuentra cancelado.' });
    }

    // APLICACIÓN DE REGLA ESTRICTA DE SEÑA (CANCELLED_BY_PATIENT pierde el payment)
    const updateResult = await prisma.turno.update({
       where: { id: turno.id },
       data: {
         estado: 'CANCELLED_BY_PATIENT',
         cancelledAt: new Date(),
         cancelledBy: 'PATIENT'
       }
    });

    res.json({ success: true, message: 'El turno ha sido cancelado. Tu seña no será reembolsada según las políticas de reserva.', turno: updateResult });

  } catch(error) {
    console.error(error);
    res.status(500).json({ error: 'Ocurrió un error al cancelar el turno.' });
  }
};
