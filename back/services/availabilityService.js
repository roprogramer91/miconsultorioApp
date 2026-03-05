const prisma = require('../prisma/client');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
const isSameOrAfter = require('dayjs/plugin/isSameOrAfter');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

class AvailabilityService {
  /**
   * Obtiene los slots disponibles para un doctor en un rango de fechas.
   * @param {number} doctorId - ID del usuario (doctor)
   * @param {string} fromDate - Fecha de inicio YYYY-MM-DD
   * @param {string} toDate - Fecha de fin YYYY-MM-DD
   */
  static async getAvailableSlots(doctorId, fromDate, toDate) {
    // 1. Obtener datos del doctor (para duración y zona horaria)
    const doctor = await prisma.usuario.findUnique({
      where: { id: parseInt(doctorId) },
      select: { timezone: true, appointmentDurationMinutes: true }
    });

    if (!doctor) throw new Error("Doctor no encontrado");
    
    const tz = doctor.timezone || 'America/Argentina/Buenos_Aires';
    const durationMins = doctor.appointmentDurationMinutes || 30;

    // 2. Obtener Reglas (AvailabilityRule)
    const rules = await prisma.availabilityRule.findMany({
      where: { usuario_id: parseInt(doctorId) }
    });

    // 3. Obtener Excepciones (AvailabilityException) en el rango
    // Las Dates en Prisma sin hora entran como 00:00:00 UTC.
    const startRange = dayjs.tz(fromDate, tz).startOf('day').toDate();
    const endRange = dayjs.tz(toDate, tz).endOf('day').toDate();

    const exceptions = await prisma.availabilityException.findMany({
      where: {
        usuario_id: parseInt(doctorId),
        date: { gte: startRange, lte: endRange }
      }
    });

    // 4. Obtener Turnos Ocupados en el rango
    const turnosOcupados = await prisma.turno.findMany({
      where: {
        usuario_id: parseInt(doctorId),
        estado: {
          notIn: ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_DOCTOR', 'EXPIRED']
        },
        inicio: { gte: startRange },
        fin: { lte: endRange }
      },
      select: { inicio: true, fin: true }
    });

    const result = [];
    let currentDate = dayjs.tz(fromDate, tz).startOf('day');
    const limitDate = dayjs.tz(toDate, tz).endOf('day');

    // 5. Iterar por cada día en el rango
    while (currentDate.isSameOrBefore(limitDate, 'day')) {
      const dayIndex = currentDate.day(); // 0 (Dom) a 6 (Sab)
      const dateStr = currentDate.format('YYYY-MM-DD');

      // Buscar excepciones para este día específico
      const dayExceptions = exceptions.filter(e => dayjs.utc(e.date).tz(tz).format('YYYY-MM-DD') === dateStr);
      
      let daySlots = [];

      // A. Procesar días bloqueados por completo
      const fullDayBlock = dayExceptions.find(e => e.type === 'BLOCK' && !e.startTime && !e.endTime);
      
      if (!fullDayBlock) { // Si el día no está 100% bloqueado
        
        // B. Cargar ventanas de tiempo en base a Reglas Regulares
        const dayRules = rules.filter(r => r.dayOfWeek === dayIndex);
        
        // Ventanas = [{ start: dayjs, end: dayjs }]
        let timeWindows = dayRules.map(rule => {
          return {
            start: currentDate.hour(parseInt(rule.startTime.split(':')[0])).minute(parseInt(rule.startTime.split(':')[1])).second(0),
            end: currentDate.hour(parseInt(rule.endTime.split(':')[0])).minute(parseInt(rule.endTime.split(':')[1])).second(0)
          };
        });

        // Sumar extras manuales (Type EXTRA)
        const extraWindows = dayExceptions.filter(e => e.type === 'EXTRA' && e.startTime && e.endTime).map(e => ({
            start: currentDate.hour(parseInt(e.startTime.split(':')[0])).minute(parseInt(e.startTime.split(':')[1])).second(0),
            end: currentDate.hour(parseInt(e.endTime.split(':')[0])).minute(parseInt(e.endTime.split(':')[1])).second(0)
        }));
        timeWindows = timeWindows.concat(extraWindows);

        // Restar Blocks Parciales (Si existen) - Implementación MVP Simplificada:
        // Si hay blocks cruzados, los slots generados se anularán abajo vía turnos virtuales.
        const partialBlocks = dayExceptions.filter(e => e.type === 'BLOCK' && e.startTime && e.endTime);
        const virtualTurnosFromBlocks = partialBlocks.map(block => ({
            inicio: currentDate.hour(parseInt(block.startTime.split(':')[0])).minute(parseInt(block.startTime.split(':')[1])).second(0).toDate(),
            fin: currentDate.hour(parseInt(block.endTime.split(':')[0])).minute(parseInt(block.endTime.split(':')[1])).second(0).toDate()
        }));

        const allOccupied = [...turnosOcupados, ...virtualTurnosFromBlocks];

        // C. Generar los slots de <durationMins> dentro de cada ventana
        for (const window of timeWindows) {
          let currentSlotStart = window.start;
          
          while (currentSlotStart.add(durationMins, 'minute').isSameOrBefore(window.end)) {
            const currentSlotEnd = currentSlotStart.add(durationMins, 'minute');
            
            // Verificar si el slot de hoy ya pasó (Solo válido para hoy)
            const isPast = currentSlotStart.isBefore(dayjs().tz(tz));
            
            if (!isPast) {
               // D. Verificar si choca con algún turno ocupado u obstáculo
               const hasOverlap = allOccupied.some(t => {
                   const tStart = dayjs(t.inicio).tz(tz);
                   const tEnd = dayjs(t.fin).tz(tz);
                   // Lógica de solapamiento estricto
                   return currentSlotStart.isBefore(tEnd) && currentSlotEnd.isAfter(tStart);
               });

               if (!hasOverlap) {
                   daySlots.push(currentSlotStart.format('HH:mm'));
               }
            }
            
            // Avanzar al siguiente slot
            currentSlotStart = currentSlotEnd;
          }
        }
      }

      // Añadir la disponibilidad del día al array si tiene al menos 1 slot libre
      if (daySlots.length > 0) {
        // Sort slots chronological
        daySlots.sort();
        result.push({
          date: dateStr,
          slots: [...new Set(daySlots)] // deduplicar posibles zonas solapadas de reglas
        });
      }

      currentDate = currentDate.add(1, 'day');
    }

    return result;
  }
}

module.exports = AvailabilityService;
