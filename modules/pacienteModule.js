const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * pacienteModule.js
 * Este módulo gestiona las consultas a la base de datos relacionadas con pacientes.
 * Recibe los datos y las llamadas de los controladores.
 */


// Obtener todos los pacientes
async function getAllPacientes() {
    return await prisma.paciente.findMany();
}

// Obtener paciente por ID
async function getPacienteById(id) {
    return await prisma.paciente.findUnique({
        where: { id: Number(id) }
    });
}

// Crear nuevo paciente
async function createPaciente(data) {
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
      notas: notas || null
    }
  });
}

// Actualizar paciente
async function updatePaciente(id, data) {
    // Note: original code only updated nombre, apellido, fecha_nacimiento, email
    // but the model fields are nombres and apellidos. I will use the current model names.
    const { nombres, apellidos, fecha_nacimiento, email, telefono, notas, dni } = data;
    
    // We only update the fields that are provided
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
async function deletePaciente(id) {
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