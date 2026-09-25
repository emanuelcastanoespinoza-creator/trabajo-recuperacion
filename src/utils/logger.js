// Registro de eventos de seguridad (control DETECTIVO).
// Cada evento se guarda en la tabla audit_logs y en logs/security.log (una línea JSON por evento).
const fs = require('fs');
const path = require('path');
const config = require('../config');
const db = require('../db');

fs.mkdirSync(path.dirname(config.logPath), { recursive: true });
const insertar = db.prepare(
  'INSERT INTO audit_logs (fecha, evento, usuario_id, email, ip, detalle) VALUES (?, ?, ?, ?, ?, ?)'
);

function logEvent(evento, { usuarioId = null, email = null, ip = null, detalle = null } = {}) {
  const fecha = new Date().toISOString();
  insertar.run(fecha, evento, usuarioId, email, ip, detalle);
  const linea = JSON.stringify({ fecha, evento, usuarioId, email, ip, detalle });
  fs.appendFileSync(config.logPath, linea + '\n');
}

module.exports = { logEvent };
