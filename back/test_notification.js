const { sendPushNotifications } = require('./services/notificationService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  console.log('Buscando tokens...');
  const pushTokens = await prisma.pushToken.findMany();
  if (pushTokens.length === 0) {
    console.log('No hay tokens registrados. Debes abrir la app primero para registrar un token.');
    return;
  }
  
  const messages = pushTokens.map(pt => ({
    to: pt.token,
    sound: 'default',
    title: 'Prueba de Notificación',
    body: 'Esto es una prueba de la integración de Expo Notifications.',
    data: { 
      screen: 'TurnoDetail',
      turnoId: 1 // Agrega un ID real si tienes turnos de prueba en tu base local
    },
  }));

  console.log('Enviando notificación a los tokens:', pushTokens.map(pt => pt.token));
  const tickets = await sendPushNotifications(messages);
  console.log('Tickets recibidos:', tickets);
  console.log('Test finalizado.');
}

test().catch(console.error).finally(() => prisma.$disconnect());
