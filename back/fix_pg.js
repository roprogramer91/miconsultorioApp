require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    await client.connect();
    console.log("Conectado a Railway PG");
    
    // Obtener medicos sin slug
    const res = await client.query("SELECT id, nombres, apellidos, slug FROM usuarios");
    
    for (let row of res.rows) {
      if(!row.slug) {
         let fix = (row.nombres + row.apellidos).replace(/\s+/g, '');
         try {
             // 1er intento: Slug limpio
             await client.query("UPDATE usuarios SET slug = $1 WHERE id = $2", [fix, row.id]);
             console.log(`Asignado slug limpio: ${fix} a ${row.nombres}`);
         } catch(err) {
             if (err.code === '23505') { // Código PG Unique Violation
                 let fallbackFix = `${fix}${row.id}`;
                 await client.query("UPDATE usuarios SET slug = $1 WHERE id = $2", [fallbackFix, row.id]);
                 console.log(`Asignado fallback slug (duplicado): ${fallbackFix} a ${row.nombres}`);
             } else {
                 throw err;
             }
         }
      } else {
         console.log(`El usuario ${row.nombres} ya tiene slug: ${row.slug}`);
      }
    }
  } catch(e) {
    console.error('Error DB:', e.message);
  } finally {
    await client.end();
  }
}
run();
