const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper: si te llegan fecha y hora por separado, las junto a ISO
function toInicio({ inicio, fecha, hora }) {
  if (inicio) return new Date(inicio); // ya viene ISO
  if (fecha && hora) return new Date(`${fecha}T${hora}`);
  throw new Error('inicio (o fecha+hora) es requerido');
}

// Obtener todos los turnos
async function getAllTurnos(usuario_id) {
  return await prisma.turno.findMany({
    where: {
      paciente: {
        usuario_id: Number(usuario_id)
      }
    },
    orderBy: { inicio: 'desc' },
    include: {
      paciente: true
    }
  });
}

// Obtener turno por ID
async function getTurnoById(id, usuario_id) {
  return await prisma.turno.findFirst({
    where: { 
      id: Number(id),
      paciente: {
        usuario_id: Number(usuario_id)
      }
    },
    include: {
      paciente: true
    }
  });
}

// Obtener turnos por paciente
async function getTurnosByPacienteId(pacienteId, usuario_id) {
  // First verify patient belongs to user
  const paciente = await prisma.paciente.findFirst({
    where: { id: Number(pacienteId), usuario_id: Number(usuario_id) }
  });
  if (!paciente) return []; // Return empty if not authorized

  return await prisma.turno.findMany({
    where: { paciente_id: Number(pacienteId) },
    orderBy: { inicio: 'desc' },
    include: {
      paciente: true
    }
  });
}

// Crear un nuevo turno
async function createTurno(turnoData, usuario_id) {
  const inicio = toInicio(turnoData);
  const { paciente_id, pacienteId, motivo, estado } = turnoData;
  const pid = paciente_id ?? pacienteId; // acepto ambos nombres por compat
  if (!pid) throw new Error('paciente_id es requerido');

  // Validate patient belongs to this user
  const paciente = await prisma.paciente.findFirst({
    where: { id: Number(pid), usuario_id: Number(usuario_id) }
  });
  if (!paciente) throw new Error('Paciente no encontrado o no autorizado');

  return await prisma.turno.create({
    data: {
      paciente_id: Number(pid),
      inicio: inicio,
      motivo: motivo || null,
      estado: estado || 'programado'
    }
  });
}

// Actualizar un turno existente (parcial)
async function updateTurno(id, turnoData, usuario_id) {
  // Verify ownership via patient relation
  const existingTurno = await prisma.turno.findFirst({
    where: { 
      id: Number(id),
      paciente: { usuario_id: Number(usuario_id) }
    }
  });
  if (!existingTurno) return null;

  // Permito actualizar inicio (vía inicio o fecha+hora), motivo y estado
  const updateData = {};
  
  if (turnoData.inicio || (turnoData.fecha && turnoData.hora)) {
    updateData.inicio = toInicio(turnoData);
  }
  
  if (turnoData.motivo !== undefined) updateData.motivo = turnoData.motivo;
  if (turnoData.estado !== undefined) updateData.estado = turnoData.estado;

  return await prisma.turno.update({
    where: { id: Number(id) },
    data: updateData
  });
}

// Eliminar un turno
async function deleteTurno(id, usuario_id) {
  // Verify ownership via patient relation
  const existingTurno = await prisma.turno.findFirst({
    where: { 
      id: Number(id),
      paciente: { usuario_id: Number(usuario_id) }
    }
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
