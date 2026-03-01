const pacientesModule = require('../modules/pacienteModule');

// Obtener todos los pacientes
exports.getAllPacientes = async (req, res) => {
    try {
        const pacientes = await pacientesModule.getAllPacientes();
        res.status(200).json(pacientes);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener pacientes' });
    }
};

// Obtener un paciente por ID
exports.getPacienteById = async (req, res) => {
    try {
        const paciente = await pacientesModule.getPacienteById(req.params.id);
        if (!paciente) {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }
        res.status(200).json(paciente);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener paciente' });
    }
};

// Crear un nuevo paciente
exports.createPaciente = async (req, res) => {
    try {
        const nuevoPaciente = await pacientesModule.createPaciente(req.body);
        res.status(201).json(nuevoPaciente);
    } catch (error) {
        console.error('Error en createPaciente:', error);
        res.status(500).json({ error: 'Error al crear paciente' });
    }
};

// Actualizar un paciente existente
exports.updatePaciente = async (req, res) => {
    try {
        const pacienteActualizado = await pacientesModule.updatePaciente(req.params.id, req.body);
        if (!pacienteActualizado) {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }
        res.status(200).json(pacienteActualizado);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar paciente' });
    }
};

// Eliminar un paciente
exports.deletePaciente = async (req, res) => {
    try {
        const eliminado = await pacientesModule.deletePaciente(req.params.id);
        if (!eliminado) {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }
        res.status(200).json({ mensaje: 'Paciente eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar paciente' });
    }
};