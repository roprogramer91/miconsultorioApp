const cron = require('node-cron');
const prisma = require('../prisma/client');
const { sendPushNotifications } = require('../services/notificationService');

const startReminderJob = () => {
  // 1. CRON EXPIRACIÓN DE SEÑAS PENDIENTES (Ejecutar cada 5 minutos)
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();
      // Buscamos PENDING_PAYMENT cuya expiresAt sea menor a Vínculo actual
      const expirados = await prisma.turno.updateMany({
        where: {
          estado: 'PENDING_PAYMENT',
          expiresAt: { lt: now }
        },
        data: {
          estado: 'EXPIRED'
        }
      });
      if (expirados.count > 0) {
        console.log(`[Job Expiración] Se han marcado ${expirados.count} turnos impagos como EXPIRED (slots liberados).`);
      }
    } catch (e) {
      console.error('[Job Expiración] Error:', e);
    }
  });

  // 2. CRON RECORDATORIOS 24H (Ejecutar cada hora en el minuto 0)
  cron.schedule('0 * * * *', async () => {
    console.log('[Job Recordatorios] Ejecutando...');
    try {
      const now = new Date();
      const tomorrowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const tomorrowEnd = new Date(tomorrowStart.getTime() + 60 * 60 * 1000);

      // Buscar turnos CONFIRMED para las próximas 24h
      const turnos = await prisma.turno.findMany({
        where: {
          estado: 'CONFIRMED',
          inicio: { gte: tomorrowStart, lt: tomorrowEnd },
        },
        include: {
          paciente: { include: { pushTokens: true } },
          usuario: { include: { pushTokens: true } }
        }
      });

      if (turnos.length === 0) return;

      const messages = [];

      for (const turno of turnos) {
        const docName = `Dr. ${turno.usuario.nombres} ${turno.usuario.apellidos}`;
        const patName = `${turno.paciente.nombres} ${turno.paciente.apellidos}`;
        const fechaHora = new Date(turno.inicio).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });

        // A. Notificación al Médico:
        if (turno.usuario.pushTokens && turno.usuario.pushTokens.length > 0) {
          for (const pt of turno.usuario.pushTokens) {
            messages.push({
              to: pt.token,
              sound: 'default',
              title: 'Recordatorio de Turno',
              body: `Mañana tienes turno con ${patName} a las ${fechaHora}`,
              data: { turnoId: turno.id, screen: 'TurnoDetail' },
            });
          }
        }

        // B. Notificación al Paciente (Con acciones Interactivas MVP)
        if (turno.paciente.pushTokens && turno.paciente.pushTokens.length > 0) {
          for (const pt of turno.paciente.pushTokens) {
            messages.push({
              to: pt.token,
              sound: 'default',
              title: `Recordatorio: Turno con ${docName}`,
              body: `Tu turno es mañana a las ${fechaHora}. ¿Asistirás?`,
              data: { 
                turnoId: turno.id, 
                // En React Native / Expo manejaremos esto como categoryIdentifier para botones
                categoryId: 'confirm_cancel_appointment'
              },
            });
          }
        }
      }

      if (messages.length > 0) {
        await sendPushNotifications(messages);
        console.log(`[Job Recordatorios] Enviadas ${messages.length} notificaciones push.`);
      }

    } catch (error) {
      console.error('[Job Recordatorios] Error:', error);
    }
  });
};

module.exports = {
  startReminderJob
};
