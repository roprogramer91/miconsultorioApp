/**
 * api.ts - Servicio centralizado de API
 * Base URL apuntando al backend en Railway
 */

const BASE_URL = 'https://miconsultorioapp-production.up.railway.app/api';

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
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
