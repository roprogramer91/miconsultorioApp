const express = require('require');
const publicController = require('../controllers/publicController');

const router = express.Router();

// 1. Obtener datos públicos del Perfil del Doctor para la Landing
router.get('/doctors/:slug', publicController.getDoctorProfile);

// 2. Obtener Slots de Disponibilidad en un rango de fechas
router.get('/doctors/:slug/availability', publicController.getDoctorAvailability);

// 3. Crear una Reserva (Paciente nuevo/existente) -> Retorna Checkout MP
router.post('/doctors/:slug/reservations', publicController.createReservation);

// 4. Webhook de MercadoPago (Recibe notificaciones de pagos aprobados)
router.post('/webhooks/mercadopago', publicController.mercadopagoWebhook);

// 5. Magic Link -> Ver Turno como Paciente
router.get('/patient/turnos', publicController.getPatientTurnoDetails);

// 6. Magic Link -> Acciones (Confirmar / Cancelar sin reembolso)
router.post('/patient/turnos/:id/confirm', publicController.confirmPatientTurno);
router.post('/patient/turnos/:id/cancel', publicController.cancelPatientTurno);

module.exports = router;
