const express = require('express');
const turnosRouter = require('./routers/turnosRoutes');
const pacientesRouter = require('./routers/pacientesRoutes');
const notificationsRouter = require('./routers/notificationsRoutes');
const authRouter = require('./routers/authRoutes');
const authMiddleware = require('./middlewares/authMiddleware');

const router = express.Router();

// Rutas públicas (No requieren JWT)
router.use('/auth', authRouter);
router.use('/notifications', notificationsRouter); // El registro de tokens puede ser temporalmente sin auth, o pasarlo a authMiddleware luego

// Aplicar middleware de autenticación a las rutas protegidas
router.use(authMiddleware);

// Rutas protegidas
router.use('/turnos', turnosRouter);
router.use('/pacientes', pacientesRouter);

module.exports = router;