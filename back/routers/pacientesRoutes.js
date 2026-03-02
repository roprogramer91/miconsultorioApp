const express = require('express');
const { getAllPacientes, getPacienteById, createPaciente, updatePaciente, deletePaciente } = require('../controllers/pacientesController.js');

const router = express.Router();

// Rutas para pacientes
router.get('/', getAllPacientes);
router.get('/:id', getPacienteById);
router.post('/', createPaciente);
router.put('/:id', updatePaciente);
router.delete('/:id', deletePaciente);

module.exports = router;
