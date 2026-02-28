const express = require('express');
require('dotenv').config();
const Router = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());


// Usamos el router principal
app.use('/api', Router);

// Start server
app.listen(PORT, () => {
    console.log(`Server corriendo en el puerto: ${PORT}`);
});