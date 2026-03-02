const turnos = require('../modules/turnosModule');

// GET /appointments
exports.getAllTurnos = async (req, res) => {
  try {
    const usuario_id = req.usuario.id;
    const data = await turnos.getAllTurnos(usuario_id);
    res.status(200).json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al obtener turnos' });
  }
};

// GET /appointments/:id   (te conviene tener este)
exports.getTurnoById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'id inválido' });
    }
    const usuario_id = req.usuario.id;
    const turno = await turnos.getTurnoById(id, usuario_id);
    if (!turno) return res.status(404).json({ error: 'Turno no encontrado o no autorizado' });
    res.status(200).json(turno);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al obtener turno' });
  }
};


exports.getTurnoByPaciente = async (req, res) => {
  try {
    const usuario_id = req.usuario.id;
    const list = await turnos.getTurnosByPacienteId(req.params.id, usuario_id);
    res.status(200).json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al obtener turnos del paciente' });
  }
};

// POST 
exports.createTurno = async (req, res) => {
  try {
    const usuario_id = req.usuario.id;
    const nuevo = await turnos.createTurno(req.body, usuario_id);
    res.status(201).json(nuevo);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message || 'Error al crear turno' });
  }
};

// PUT /appointments/:id
exports.updateTurno = async (req, res) => {
  try {
    const usuario_id = req.usuario.id;
    const upd = await turnos.updateTurno(req.params.id, req.body, usuario_id);
    if (!upd) return res.status(404).json({ error: 'Turno no encontrado o no autorizado' });
    res.status(200).json(upd);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message || 'Error al actualizar turno' });
  }
};

// DELETE /appointments/:id
exports.deleteTurno = async (req, res) => {
  try {
    const usuario_id = req.usuario.id;
    const ok = await turnos.deleteTurno(req.params.id, usuario_id);
    if (!ok) return res.status(404).json({ error: 'Turno no encontrado o no autorizado' });
    res.status(200).json({ mensaje: 'Turno eliminado correctamente' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al eliminar turno' });
  }
};
