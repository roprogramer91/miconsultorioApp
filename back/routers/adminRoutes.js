const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Rutas protegidas por payload en el cuerpo ({ username, password })
router.post('/landing-config', adminController.updateLandingConfig);
router.post('/doctors', adminController.createDoctor);

module.exports = router;
