const express = require('express');
const turnosRouter = require('./routers/turnosRoutes');
const pacientesRouter = require('./routers/pacientesRoutes');

const router = express.Router();


// Usar los routers
router.use('/turnos', turnosRouter);
router.use('/pacientes', pacientesRouter);

module.exports = router;