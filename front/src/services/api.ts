/**
 * api.ts - Servicio centralizado de API
 * Base URL apuntando al backend en Railway
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://miconsultorioapp-production.up.railway.app/api';

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await AsyncStorage.getItem('userToken');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { ...headers, ...(options?.headers || {}) },
    ...options,
  });

  if (!res.ok) {
    if (res.status === 401) {
      // Opcionalmente: limpiar el token si expira para forzar re-login
      // await AsyncStorage.removeItem('userToken');
    }
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `Error ${res.status}`);
  }
  return res.json();
}

// ─── Helpers de fecha ────────────────────────────────────────────────────────
// El backend almacena fechas como ISO DateTime.
// El frontend las muestra como DD/MM/YYYY.

export function isoToDDMMYYYY(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return undefined;
  return [
    String(d.getUTCDate()).padStart(2, '0'),
    String(d.getUTCMonth() + 1).padStart(2, '0'),
    d.getUTCFullYear(),
  ].join('/');
}

export function ddmmyyyyToISO(ddmmyyyy?: string): string | undefined {
  if (!ddmmyyyy) return undefined;
  const [d, m, y] = ddmmyyyy.split('/');
  if (!d || !m || !y) return undefined;
  return new Date(`${y}-${m}-${d}T00:00:00.000Z`).toISOString();
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type Paciente = {
  id: number;
  nombres: string;
  apellidos: string;
  dni?: string;
  telefono?: string;
  email?: string;
  fecha_nacimiento?: string; // ISO string del backend
  notas?: string;
};

export type PacienteFront = {
  id: number;
  nombres: string;
  apellidos: string;
  dni?: string;
  telefono?: string;
  email?: string;
  fecha_nacimiento?: string; // DD/MM/YYYY para el frontend
  notas?: string;
  ultimaVisita?: string; // opcional para el Home
};

export type TurnoFront = {
  id: number;
  paciente_id: number;
  inicio?: string; // ISO DateTime
  fecha: string;
  hora: string;
  motivo?: string;
  notas?: string;
  estado: string;
  paciente?: { nombres: string; apellidos: string; dni?: string };
};

// ─── API Pacientes ────────────────────────────────────────────────────────────

function mapPaciente(p: Paciente): PacienteFront {
  return {
    ...p,
    fecha_nacimiento: isoToDDMMYYYY(p.fecha_nacimiento),
  };
}

export async function getPacientes(): Promise<PacienteFront[]> {
  const data = await request<Paciente[]>('/pacientes');
  return data.map(mapPaciente);
}

export async function getPacienteById(id: number): Promise<PacienteFront> {
  const data = await request<Paciente>(`/pacientes/${id}`);
  return mapPaciente(data);
}

export async function createPaciente(p: Omit<PacienteFront, 'id'>): Promise<PacienteFront> {
  const body = { ...p, fecha_nacimiento: ddmmyyyyToISO(p.fecha_nacimiento) };
  const data = await request<Paciente>('/pacientes', { method: 'POST', body: JSON.stringify(body) });
  return mapPaciente(data);
}

export async function updatePaciente(id: number, p: Partial<PacienteFront>): Promise<void> {
  const body = { ...p, fecha_nacimiento: p.fecha_nacimiento ? ddmmyyyyToISO(p.fecha_nacimiento) : undefined };
  await request(`/pacientes/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deletePaciente(id: number): Promise<void> {
  await request(`/pacientes/${id}`, { method: 'DELETE' });
}

// ─── API Turnos ───────────────────────────────────────────────────────────────

export async function getTurnos(): Promise<TurnoFront[]> {
  return request<TurnoFront[]>('/turnos');
}

export async function getTurnosByPaciente(pacienteId: number): Promise<TurnoFront[]> {
  return request<TurnoFront[]>(`/turnos/paciente/${pacienteId}`);
}

export async function createTurno(data: {
  paciente_id: number;
  fecha: string;   // YYYY-MM-DD
  hora: string;    // HH:MM
  motivo?: string;
  notas?: string;
  estado?: string;
}): Promise<TurnoFront> {
  return request<TurnoFront>('/turnos', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateTurno(id: number, data: Partial<{ fecha: string; hora: string; motivo: string; estado: string; notas: string }>): Promise<TurnoFront> {
  return request<TurnoFront>(`/turnos/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteTurno(id: number): Promise<void> {
  await request(`/turnos/${id}`, { method: 'DELETE' });
}

// ─── API Doctor (Fase 5/6) ───────────────────────────────────────────────────

export type DashboardMetrics = {
    mesActual: string;
    turnosConfirmados: number;
    ingresosSenaDepositados: number;
    turnosCancelados: number;
};

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
    return request<DashboardMetrics>('/me/metrics');
}

// ─── DISPONIBILIDAD (REGLAS Y EXCEPCIONES) ──────────────────────────────────
export type Rule = { id: number; dayOfWeek: number; startTime: string; endTime: string; };
export type Exception = { id: number; date: string; startTime: string | null; endTime: string | null; type: string; description: string | null; };

export async function getRules(): Promise<Rule[]> {
   return request<Rule[]>('/me/availability/rules');
}
export async function createRule(data: Omit<Rule, 'id'>): Promise<Rule> {
   return request<Rule>('/me/availability/rules', { method: 'POST', body: JSON.stringify(data) });
}
export async function deleteRule(id: number): Promise<void> {
   await request(`/me/availability/rules/${id}`, { method: 'DELETE' });
}

export async function getExceptions(): Promise<Exception[]> {
   return request<Exception[]>('/me/availability/exceptions');
}
export async function createException(data: Omit<Exception, 'id'>): Promise<Exception> {
   return request<Exception>('/me/availability/exceptions', { method: 'POST', body: JSON.stringify(data) });
}
export async function deleteException(id: number): Promise<void> {
   await request(`/me/availability/exceptions/${id}`, { method: 'DELETE' });
}

// ─── API PÚBLICA (PACIENTES) ──────────────────────────────────────────────────
export type PublicDoctor = { nombres: string; apellidos: string; specialty: string; address: string; bio: string; picture: string; price: string };
export type PublicSlot = { date: string; slots: string[] };

export async function getPublicDoctor(slug: string): Promise<PublicDoctor> {
   const res = await fetch(`${BASE_URL}/public/doctors/${slug}`);
   if(!res.ok) throw new Error("Doctor no encontrado");
   return res.json();
}

export async function getPublicSlots(slug: string, dateFrom: string, dateTo: string): Promise<PublicSlot[]> {
   const res = await fetch(`${BASE_URL}/public/doctors/${slug}/availability?from=${dateFrom}&to=${dateTo}`);
   if(!res.ok) throw new Error("Error obteniendo turnos");
   return res.json();
}

export type ReservationData = {
   nombres: string; apellidos: string; dni: string; email: string; telefono: string; date: string; time: string;
};

export async function createReservation(slug: string, data: ReservationData): Promise<{init_point: string}> {
   const res = await fetch(`${BASE_URL}/public/doctors/${slug}/reservations`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(data)
   });
   
   if(!res.ok) {
       const err = await res.json().catch(()=>({}));
       throw new Error(err.error || "Error creando reserva");
   }
   return res.json();
}
