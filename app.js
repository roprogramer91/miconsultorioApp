const express = require('express');
require('dotenv').config();
const Router = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

const cors = require('cors');

// Middlewares
app.use(cors());
app.use(express.json());

// Usamos el router principal
app.use('/api', Router);

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server corriendo en el puerto: ${PORT}`);
});