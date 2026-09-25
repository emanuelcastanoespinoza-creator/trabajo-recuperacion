// Crea los usuarios de PRUEBA (uno por rol) y algunos tickets de ejemplo.
// Uso: npm run seed
const bcrypt = require('bcryptjs');
const config = require('../src/config');
const db = require('../src/db');

const USUARIOS_PRUEBA = [
  { nombre: 'Administrador', email: 'admin@securedesk.local', rol: 'admin', clave: process.env.SEED_ADMIN_PASSWORD || 'Admin123*' },
  { nombre: 'Tecnico Soporte', email: 'tecnico@securedesk.local', rol: 'tecnico', clave: process.env.SEED_TECNICO_PASSWORD || 'Tecnico123*' },
  { nombre: 'Usuario Final', email: 'usuario@securedesk.local', rol: 'usuario', clave: process.env.SEED_USUARIO_PASSWORD || 'Usuario123*' },
];

function seed() {
  const existe = db.prepare('SELECT id FROM usuarios WHERE email = ?');
  const crear = db.prepare('INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)');
  const ids = {};

  for (const u of USUARIOS_PRUEBA) {
    const fila = existe.get(u.email);
    ids[u.rol] = fila ? fila.id : Number(crear.run(u.nombre, u.email, bcrypt.hashSync(u.clave, config.bcryptRounds), u.rol).lastInsertRowid);
  }

  const hayTickets = db.prepare('SELECT COUNT(*) AS n FROM tickets').get().n > 0;
  if (!hayTickets) {
    const ticket = db.prepare('INSERT INTO tickets (titulo, descripcion, prioridad, creado_por) VALUES (?, ?, ?, ?)');
    ticket.run('No puedo imprimir', 'La impresora del piso 2 no responde desde esta mañana.', 'media', ids.usuario);
    ticket.run('Correo no sincroniza', 'El correo en el celular dejó de sincronizar ayer.', 'alta', ids.usuario);
    ticket.run('Solicitud de software', 'Necesito instalar el editor de código en mi equipo.', 'baja', ids.tecnico);
  }
  return ids;
}

module.exports = { seed, USUARIOS_PRUEBA };

if (require.main === module) {
  seed();
  console.log('Usuarios de prueba listos:');
  for (const u of USUARIOS_PRUEBA) console.log(`  ${u.rol.padEnd(8)} ${u.email}  /  ${u.clave}`);
}
