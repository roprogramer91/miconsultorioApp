const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { sendPushNotifications } = require('../services/notificationService');

const prisma = new PrismaClient();

const startReminderJob = () => {
  // Configurado para ejecutarse todos los dias a las 08:00 AM (Ajustable)
  // Como simplificación para la prueba, podemos ejecutarlo cada hora (0 * * * *)
  cron.schedule('0 * * * *', async () => {
    console.log('Ejecutando job de recordatorios...');
    try {
      const now = new Date();
      // "Mañana" = 24 a 25 horas desde ahora (para ejecutar una vez y cubrir todas las próximas 24 horas)
      const tomorrowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const tomorrowEnd = new Date(tomorrowStart.getTime() + 60 * 60 * 1000);

      const turnos = await prisma.turno.findMany({
        where: {
          inicio: {
            gte: tomorrowStart,
            lt: tomorrowEnd,
          },
        },
        include: {
          paciente: true
        }
      });

      if (turnos.length === 0) {
        console.log('No hay recordatorios para enviar.');
        return;
      }

      const pushTokens = await prisma.pushToken.findMany();
      if (pushTokens.length === 0) {
        console.log('No hay tokens push registrados.');
        return;
      }

      const messages = [];

      for (const turno of turnos) {
        const title = 'Recordatorio de Turno';
        const body = `Recuerda que mañana tienes turno con ${turno.paciente.nombres} ${turno.paciente.apellidos}`;
        
        for (const pt of pushTokens) {
          messages.push({
            to: pt.token,
            sound: 'default',
            title,
            body,
            data: { 
              turnoId: turno.id,
              screen: 'TurnoDetail' 
            },
          });
        }
      }

      if (messages.length > 0) {
        await sendPushNotifications(messages);
        console.log(`Enviados ${messages.length} recordatorios.`);
      }

    } catch (error) {
      console.error('Error en el job de recordatorios:', error);
    }
  });
};

module.exports = {
  startReminderJob
};
