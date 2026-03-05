const prisma = require('../prisma/client');

/**
 * pacienteModule.js
 * Este módulo gestiona las consultas a la base de datos relacionadas con pacientes.
 * Recibe los datos y las llamadas de los controladores.
 */


// Obtener todos los pacientes
async function getAllPacientes(usuario_id) {
    return await prisma.paciente.findMany({
        where: { usuario_id: Number(usuario_id) }
    });
}

// Obtener paciente por ID
async function getPacienteById(id, usuario_id) {
    return await prisma.paciente.findFirst({
        where: { 
            id: Number(id),
            usuario_id: Number(usuario_id)
        }
    });
}

// Crear nuevo paciente
async function createPaciente(data, usuario_id) {
  const {
    dni,
    nombres,
    apellidos,
    fecha_nacimiento,
    telefono,
    email,
    notas
  } = data;

  return await prisma.paciente.create({
    data: {
      dni: dni || null,
      nombres,
      apellidos,
      fecha_nacimiento: fecha_nacimiento ? new Date(fecha_nacimiento) : null,
      telefono: telefono || null,
      email: email || null,
      notas: notas || null,
      usuario_id: Number(usuario_id)
    }
  });
}

// Actualizar paciente
async function updatePaciente(id, data, usuario_id) {
    const { nombres, apellidos, fecha_nacimiento, email, telefono, notas, dni } = data;
    
    // Check ownership first
    const existing = await prisma.paciente.findFirst({
        where: { id: Number(id), usuario_id: Number(usuario_id) }
    });
    if (!existing) return null;

    const updateData = {};
    if (nombres !== undefined) updateData.nombres = nombres;
    if (apellidos !== undefined) updateData.apellidos = apellidos;
    if (fecha_nacimiento !== undefined) updateData.fecha_nacimiento = new Date(fecha_nacimiento);
    if (email !== undefined) updateData.email = email;
    if (telefono !== undefined) updateData.telefono = telefono;
    if (notas !== undefined) updateData.notas = notas;
    if (dni !== undefined) updateData.dni = dni;

    await prisma.paciente.update({
        where: { id: Number(id) },
        data: updateData
    });
    
    return true;
}

// Eliminar paciente
async function deletePaciente(id, usuario_id) {
    // Check ownership first
    const existing = await prisma.paciente.findFirst({
        where: { id: Number(id), usuario_id: Number(usuario_id) }
    });
    if (!existing) return null;

    await prisma.paciente.delete({
        where: { id: Number(id) }
    });
    return true;
}

module.exports = {
    getAllPacientes,
    getPacienteById,
    createPaciente,
    updatePaciente,
    deletePaciente
};