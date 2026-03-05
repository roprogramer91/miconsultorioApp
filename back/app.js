const express = require('express');
require('dotenv').config();
const path = require('path');
const Router = require('./routes');
const publicViewController = require('./controllers/publicViewController');

const app = express();
const PORT = process.env.PORT || 3000;

const cors = require('cors');

// View Engine y Estáticos
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Middlewares
app.use(cors());
app.use(express.json());

// Usamos el router principal API (PRIMERO, antes de las rutas de Landing)
app.use('/api', Router);

// Ruta de Reserva Online (redirige al sistema de booking de la App)
const APP_WEB_URL = process.env.APP_WEB_URL || 'http://localhost:8081';
app.get('/reservar/:slug', (req, res) => {
    const { slug } = req.params;
    res.redirect(`${APP_WEB_URL}/booking/${slug}`);
});

// Landing Page Pública Renderizada desde Backend (HTML/EJS) — ÚLTIMO: comodín /:slug
app.get('/:slug', publicViewController.renderLanding);


// Iniciar Jobs en segundo plano
const { startReminderJob } = require('./jobs/reminderJob');
startReminderJob();

// Pre-conectar Prisma al inicio para que el primer request no sufra latencia de conexión
const prisma = require('./prisma/client');
prisma.$connect()
    .then(() => console.log('Prisma conectado a la BD correctamente.'))
    .catch((e) => console.error('Error al conectar Prisma:', e.message));

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server corriendo en el puerto: ${PORT}`);
});