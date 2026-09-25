// TICKETS de soporte. Permisos por rol:
//   usuario -> crea tickets y ve solo los suyos
//   tecnico -> ve todos y cambia el estado
//   admin   -> todo lo anterior y además puede eliminar
const express = require('express');
const db = require('../db');
const autenticar = require('../middleware/autenticar');
const autorizar = require('../middleware/autorizar');
const { logEvent } = require('../utils/logger');
const { validarTicket, ESTADOS } = require('../utils/validar');

const router = express.Router();

// Todas las rutas de tickets exigen estar logueado (token válido).
router.use(autenticar);

// POST /api/tickets  -> cualquier usuario logueado crea un ticket
router.post('/', (req, res) => {
  const { titulo, descripcion, prioridad = 'media' } = req.body || {};
  const errores = validarTicket({ titulo, descripcion, prioridad });
  if (errores.length > 0) return res.status(400).json({ errores });

  const resultado = db
    .prepare('INSERT INTO tickets (titulo, descripcion, prioridad, creado_por) VALUES (?, ?, ?, ?)')
    .run(titulo, descripcion, prioridad, req.usuario.id);

  const id = Number(resultado.lastInsertRowid);
  logEvent('TICKET_CREADO', { usuarioId: req.usuario.id, email: req.usuario.email, ip: req.ip, detalle: `ticket ${id}` });
  res.status(201).json(db.prepare('SELECT * FROM tickets WHERE id = ?').get(id));
});

// GET /api/tickets  -> el usuario ve los suyos; tecnico y admin ven todos
router.get('/', (req, res) => {
  let tickets;
  if (req.usuario.rol === 'usuario') {
    tickets = db.prepare('SELECT * FROM tickets WHERE creado_por = ? ORDER BY id DESC').all(req.usuario.id);
  } else {
    tickets = db.prepare('SELECT * FROM tickets ORDER BY id DESC').all();
  }
  res.json(tickets);
});

// GET /api/tickets/:id  -> un usuario NO puede ver el ticket de otra persona
router.get('/:id', (req, res) => {
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(Number(req.params.id));
  if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });

  if (req.usuario.rol === 'usuario' && ticket.creado_por !== req.usuario.id) {
    logEvent('ACCESO_DENEGADO', { usuarioId: req.usuario.id, email: req.usuario.email, ip: req.ip, detalle: `intentó ver el ticket ${ticket.id} de otro usuario` });
    return res.status(403).json({ error: 'No tienes permiso para ver este ticket' });
  }
  res.json(ticket);
});

// PATCH /api/tickets/:id/estado  -> solo tecnico y admin
router.patch('/:id/estado', autorizar('tecnico', 'admin'), (req, res) => {
  const { estado } = req.body || {};
  if (!ESTADOS.includes(estado)) {
    return res.status(400).json({ errores: ['estado debe ser: ' + ESTADOS.join(', ')] });
  }

  const id = Number(req.params.id);
  const resultado = db
    .prepare('UPDATE tickets SET estado = ?, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?')
    .run(estado, id);
  if (resultado.changes === 0) return res.status(404).json({ error: 'Ticket no encontrado' });

  logEvent('TICKET_ESTADO', { usuarioId: req.usuario.id, email: req.usuario.email, ip: req.ip, detalle: `ticket ${id} -> ${estado}` });
  res.json(db.prepare('SELECT * FROM tickets WHERE id = ?').get(id));
});

// DELETE /api/tickets/:id  -> solo admin
router.delete('/:id', autorizar('admin'), (req, res) => {
  const id = Number(req.params.id);
  const resultado = db.prepare('DELETE FROM tickets WHERE id = ?').run(id);
  if (resultado.changes === 0) return res.status(404).json({ error: 'Ticket no encontrado' });

  logEvent('TICKET_ELIMINADO', { usuarioId: req.usuario.id, email: req.usuario.email, ip: req.ip, detalle: `ticket ${id}` });
  res.status(204).end();
});

module.exports = router;
