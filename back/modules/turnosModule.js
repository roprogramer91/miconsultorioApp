const prisma = require('../prisma/client');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

// Helper: si te llegan fecha y hora por separado, las junto a ISO
function toInicio({ inicio, fecha, hora }) {
  if (inicio) return new Date(inicio); // ya viene ISO
  if (fecha && hora) return new Date(`${fecha}T${hora}`);
  throw new Error('inicio (o fecha+hora) es requerido');
}

// Obtener todos los turnos del doctor
async function getAllTurnos(usuario_id) {
  return await prisma.turno.findMany({
    where: { usuario_id: Number(usuario_id) },
    orderBy: { inicio: 'desc' },
    include: { paciente: true }
  });
}

// Obtener turno por ID
async function getTurnoById(id, usuario_id) {
  return await prisma.turno.findFirst({
    where: { 
      id: Number(id),
      usuario_id: Number(usuario_id)
    },
    include: { paciente: true }
  });
}

// Obtener turnos por paciente
async function getTurnosByPacienteId(pacienteId, usuario_id) {
  const paciente = await prisma.paciente.findFirst({
    where: { id: Number(pacienteId), usuario_id: Number(usuario_id) }
  });
  if (!paciente) return []; // Return empty if not authorized

  return await prisma.turno.findMany({
    where: { paciente_id: Number(pacienteId), usuario_id: Number(usuario_id) },
    orderBy: { inicio: 'desc' },
    include: { paciente: true }
  });
}

// Crear un nuevo turno (MANUAL desde dashboard Doctor)
async function createTurno(turnoData, usuario_id) {
  const inicioDate = toInicio(turnoData);
  const { paciente_id, pacienteId, motivo, estado, durationMins } = turnoData;
  const pid = paciente_id ?? pacienteId; 
  if (!pid) throw new Error('paciente_id es requerido');

  // Validate patient belongs to this user
  const paciente = await prisma.paciente.findFirst({
    where: { id: Number(pid), usuario_id: Number(usuario_id) }
  });
  if (!paciente) throw new Error('Paciente no encontrado o no autorizado');

  const doctor = await prisma.usuario.findUnique({ where: { id: Number(usuario_id) } });
  if(!doctor) throw new Error('Doctor no existe');
  
  const tz = doctor.timezone || 'America/Argentina/Buenos_Aires';
  const duration = durationMins || doctor.appointmentDurationMinutes;
  
  // Calcular fin exacto
  const finDate = dayjs(inicioDate).add(duration, 'minute').toDate();

  // ----- TRANSACCIÓN SERIALIZABLE (Prevención Double Booking) ----- //
  return await prisma.$transaction(async (tx) => {
    // Verificar colisiones
    const overlapCount = await tx.turno.count({
      where: {
        usuario_id: Number(usuario_id),
        estado: { notIn: ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_DOCTOR', 'EXPIRED'] },
        AND: [
            { inicio: { lt: finDate } },
            { fin: { gt: inicioDate } }
        ]
      }
    });

    if (overlapCount > 0) {
      throw new Error("El horario seleccionado ya no se encuentra disponible (ocupado por otro turno).");
    }

    // Insertar si está libre
    return await tx.turno.create({
      data: {
        usuario_id: Number(usuario_id),
        paciente_id: Number(pid),
        inicio: inicioDate,
        fin: finDate,
        motivo: motivo || null,
        estado: estado || 'CONFIRMED', // Turnos creados manual por doctor son CONFIRMED por defecto
        source: 'MANUAL'
      }
    });
  }, { isolationLevel: 'Serializable' });
}

// Actualizar un turno existente (parcial)
async function updateTurno(id, turnoData, usuario_id) {
  const existingTurno = await prisma.turno.findFirst({
    where: { 
      id: Number(id),
      usuario_id: Number(usuario_id) 
    }
  });
  if (!existingTurno) return null;

  const updateData = {};
  
  if (turnoData.inicio || (turnoData.fecha && turnoData.hora)) {
    updateData.inicio = toInicio(turnoData);
    // Nota: Si cambian el horario, deberíamos verificar OVERLAP. 
    // Para simplificar MVP Dashboard doctor asume responsabilidad, o llamaríamos a lógica de transacción.
  }
  if (turnoData.fin) updateData.fin = new Date(turnoData.fin);
  if (turnoData.motivo !== undefined) updateData.motivo = turnoData.motivo;
  if (turnoData.estado !== undefined) updateData.estado = turnoData.estado;

  return await prisma.turno.update({
    where: { id: Number(id) },
    data: updateData
  });
}

// Eliminar un turno (o "Cancelar" lógicamente mejor)
async function deleteTurno(id, usuario_id) {
  const existingTurno = await prisma.turno.findFirst({
    where: { id: Number(id), usuario_id: Number(usuario_id) }
  });
  if (!existingTurno) return null;

  await prisma.turno.delete({
    where: { id: Number(id) }
  });
  return true;
}

module.exports = {
  getAllTurnos,
  getTurnoById,
  getTurnosByPacienteId,
  createTurno,
  updateTurno,
  deleteTurno,
};
