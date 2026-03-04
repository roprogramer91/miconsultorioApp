const express = require('express');
const turnosRouter = require('./routers/turnosRoutes');
const pacientesRouter = require('./routers/pacientesRoutes');
const notificationsRouter = require('./routers/notificationsRoutes');
const authRouter = require('./routers/authRoutes');
const authMiddleware = require('./middlewares/authMiddleware');

// Rutas Nuevas de la fase 3 
const publicRouter = require('./routers/publicRoutes');
const doctorRouter = require('./routers/doctorRoutes');

const router = express.Router();

// Rutas públicas (No requieren JWT)
router.use('/auth', authRouter);
router.use('/public', publicRouter); // Landing, Webhooks MP y Reservas de Pacientes
router.use('/notifications', notificationsRouter); // El registro de tokens puede ser temporalmente sin auth, o pasarlo a authMiddleware luego

// Aplicar middleware de autenticación a las rutas protegidas del SaaS Dashboard
router.use(authMiddleware);

// Rutas protegidas (Doctor Privado)
router.use('/me', doctorRouter); // Perfil, Métricas, Disponibilidad
router.use('/turnos', turnosRouter);
router.use('/pacientes', pacientesRouter);

module.exports = router;