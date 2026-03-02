const express = require('express');
const {
  getAllTurnos,
  getTurnoByPaciente,
  getTurnoById,
  createTurno,
  updateTurno,
  deleteTurno
} = require('../controllers/turnosController');

const router = express.Router();

// routes/turnos.js
router.get('/', getAllTurnos);
router.get('/paciente/:id', getTurnoByPaciente);
router.get('/:id', getTurnoById);          // ← sin regex
router.post('/', createTurno);
router.put('/:id', updateTurno);
router.delete('/:id', deleteTurno);

module.exports = router;
