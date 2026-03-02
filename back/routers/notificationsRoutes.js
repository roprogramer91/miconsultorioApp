const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsController');

router.post('/register', notificationsController.registerToken);

module.exports = router;
