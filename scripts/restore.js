// RESTAURACIÓN de la base de datos desde un backup.
// Uso:
//   npm run restore                      -> usa el backup más reciente
//   npm run restore -- backups/archivo.db -> usa un backup específico
// IMPORTANTE: detén el servidor antes de restaurar.
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const config = require('../src/config');

function ultimoBackup(carpeta = config.backupDir) {
  if (!fs.existsSync(carpeta)) return null;
  const archivos = fs.readdirSync(carpeta).filter((f) => f.endsWith('.db')).sort();
  return archivos.length ? path.join(carpeta, archivos[archivos.length - 1]) : null;
}

function restaurar(archivo, dbPath = config.dbPath) {
  if (!archivo || !fs.existsSync(archivo)) throw new Error('No existe el backup: ' + archivo);

  // 1. Revisar que el backup no esté dañado antes de usarlo.
  const prueba = new DatabaseSync(archivo);
  const resultado = prueba.prepare('PRAGMA integrity_check').get();
  prueba.close();
  if (resultado.integrity_check !== 'ok') throw new Error('El backup está dañado');

  // 2. Plan de reversa: guardar una copia de la base actual por si algo sale mal.
  if (fs.existsSync(dbPath)) fs.copyFileSync(dbPath, dbPath + '.antes-de-restaurar');

  // 3. Reemplazar la base actual por el backup.
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.copyFileSync(archivo, dbPath);
}

module.exports = { restaurar, ultimoBackup };

if (require.main === module) {
  const archivo = process.argv[2] ? path.resolve(process.argv[2]) : ultimoBackup();
  restaurar(archivo);
  console.log('Base de datos restaurada desde: ' + archivo);
  console.log('La base anterior quedó guardada en: ' + config.dbPath + '.antes-de-restaurar');
}
