const URL = "https://miconsultorioapp-production.up.railway.app/api/pacientes";

const pacientes = [
  { 
    nombres: 'María', 
    apellidos: 'González', 
    dni: '28.456.789', 
    telefono: '11-2345-6789', 
    email: 'maria.gonzalez@email.com', 
    fecha_nacimiento: '1985-03-15T00:00:00.000Z', 
    notas: 'Paciente con hipertensión controlada. Tomar presión en cada visita.' 
  },
  { 
    nombres: 'Carlos', 
    apellidos: 'Rodríguez', 
    dni: '32.100.203', 
    telefono: '11-9876-5432', 
    email: 'carlos.rod@gmail.com', 
    fecha_nacimiento: '1979-07-22T00:00:00.000Z' 
  },
  { 
    nombres: 'Ana Laura', 
    apellidos: 'Fernández', 
    dni: '40.111.222', 
    telefono: '11-5555-1234', 
    fecha_nacimiento: '1995-11-08T00:00:00.000Z', 
    notas: 'Primera consulta: derivada por clínica médica.' 
  }
];

async function seed() {
  console.log('Insertando pacientes en', URL);
  for (const p of pacientes) {
    try {
      const res = await fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p)
      });
      const data = await res.json();
      console.log(`[${res.status}] Paciente insertado: ${data.nombres} ${data.apellidos} (ID: ${data.id})`);
    } catch (e) {
      console.error(`Error insertando paciente:`, e);
    }
  }
}

seed();
