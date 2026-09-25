// GESTIÓN DE USUARIOS: todas estas rutas son solo para el rol admin.
const express = require('express');
const bcrypt = require('bcryptjs');
const config = require('../config');
const db = require('../db');
const autenticar = require('../middleware/autenticar');
const autorizar = require('../middleware/autorizar');
const { logEvent } = require('../utils/logger');
const { validarUsuario, ROLES } = require('../utils/validar');

const router = express.Router();

// Primero se verifica el token y después que el rol sea admin.
router.use(autenticar, autorizar('admin'));

// GET /api/usuarios  -> lista de usuarios (sin el hash de la contraseña)
router.get('/', (req, res) => {
  res.json(db.prepare('SELECT id, nombre, email, rol, activo, creado_en FROM usuarios').all());
});

// POST /api/usuarios  -> el admin crea usuarios con cualquier rol
router.post('/', (req, res) => {
  const { nombre, email, password, rol } = req.body || {};
  const errores = validarUsuario({ nombre, email, password, rol }, true);
  if (errores.length > 0) return res.status(400).json({ errores });

  if (db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email)) {
    return res.status(409).json({ error: 'El email ya está registrado' });
  }

  const hash = bcrypt.hashSync(password, config.bcryptRounds);
  const resultado = db
    .prepare('INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)')
    .run(nombre, email, hash, rol);

  logEvent('USUARIO_CREADO', { usuarioId: req.usuario.id, email: req.usuario.email, ip: req.ip, detalle: `${email} con rol ${rol}` });
  res.status(201).json({ id: Number(resultado.lastInsertRowid), nombre, email, rol });
});

// PATCH /api/usuarios/:id/rol  -> cambiar el rol de un usuario
router.patch('/:id/rol', (req, res) => {
  const id = Number(req.params.id);
  const { rol } = req.body || {};

  if (!ROLES.includes(rol)) return res.status(400).json({ errores: ['rol debe ser: ' + ROLES.join(', ')] });
  // El admin no puede quitarse su propio rol (el sistema quedaría sin administrador).
  if (id === req.usuario.id) return res.status(400).json({ error: 'No puedes cambiar tu propio rol' });

  const usuario = db.prepare('SELECT email, rol FROM usuarios WHERE id = ?').get(id);
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

  db.prepare('UPDATE usuarios SET rol = ? WHERE id = ?').run(rol, id);
  logEvent('ROL_CAMBIADO', { usuarioId: req.usuario.id, email: req.usuario.email, ip: req.ip, detalle: `${usuario.email}: ${usuario.rol} -> ${rol}` });
  res.json({ id, email: usuario.email, rol });
});

module.exports = router;
