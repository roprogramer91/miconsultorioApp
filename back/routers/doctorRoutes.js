const express = require('express');
const doctorController = require('../controllers/doctorController');

const router = express.Router();

// Perfil Médico SaaS (Slug, Precios, Bio, etc.)
router.get('/profile', doctorController.getDoctorProfile);
router.put('/profile', doctorController.updateDoctorProfile);

// Reglas y Excepciones de Disponibilidad
router.get('/availability/rules', doctorController.getAvailabilityRules);
router.post('/availability/rules', doctorController.createAvailabilityRule);
router.delete('/availability/rules/:id', doctorController.deleteAvailabilityRule);

router.get('/availability/exceptions', doctorController.getAvailabilityExceptions);
router.post('/availability/exceptions', doctorController.createAvailabilityException);
router.delete('/availability/exceptions/:id', doctorController.deleteAvailabilityException);

// Métricas MVP del SaaS
router.get('/metrics', doctorController.getDashboardMetrics);

module.exports = router;
