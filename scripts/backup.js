// BACKUP de la base de datos.
// Uso: npm run backup
// Crea una copia de la base en la carpeta backups/ con la fecha y hora en el nombre.
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const config = require('../src/config');

// Nombre con fecha: securedesk-2026-09-25T14-30-00.db
function nombreConFecha() {
  const fecha = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  return `securedesk-${fecha}.db`;
}

function crearBackup(dbPath = config.dbPath, carpeta = config.backupDir) {
  if (!fs.existsSync(dbPath)) throw new Error('No existe la base de datos: ' + dbPath);
  fs.mkdirSync(carpeta, { recursive: true });

  const destino = path.join(carpeta, nombreConFecha());
  const db = new DatabaseSync(dbPath);
  // VACUUM INTO copia la base completa a otro archivo de forma segura,
  // incluso si el servidor está encendido.
  db.exec(`VACUUM INTO '${destino}'`);
  db.close();
  return destino;
}

module.exports = { crearBackup };

// Solo se ejecuta si se llama directamente (npm run backup)
if (require.main === module) {
  const destino = crearBackup();
  console.log('Backup creado en: ' + destino);
}
