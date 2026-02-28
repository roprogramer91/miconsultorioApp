const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper: si te llegan fecha y hora por separado, las junto a ISO
function toInicio({ inicio, fecha, hora }) {
  if (inicio) return new Date(inicio); // ya viene ISO
  if (fecha && hora) return new Date(`${fecha}T${hora}`);
  throw new Error('inicio (o fecha+hora) es requerido');
}

// Obtener todos los turnos
async function getAllTurnos() {
  return await prisma.turno.findMany({
    orderBy: { inicio: 'desc' }
  });
}

// Obtener turno por ID
async function getTurnoById(id) {
  return await prisma.turno.findUnique({
    where: { id: Number(id) }
  });
}

// Obtener turnos por paciente
async function getTurnosByPacienteId(pacienteId) {
  return await prisma.turno.findMany({
    where: { paciente_id: Number(pacienteId) },
    orderBy: { inicio: 'desc' }
  });
}

// Crear un nuevo turno
async function createTurno(turnoData) {
  const inicio = toInicio(turnoData);
  const { paciente_id, pacienteId, motivo, estado } = turnoData;
  const pid = paciente_id ?? pacienteId; // acepto ambos nombres por compat
  if (!pid) throw new Error('paciente_id es requerido');

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
async function updateTurno(id, turnoData) {
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
async function deleteTurno(id) {
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
