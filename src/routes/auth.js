// AUTENTICACIÓN: registro, login (genera el JWT) y perfil.
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const db = require('../db');
const autenticar = require('../middleware/autenticar');
const { logEvent } = require('../utils/logger');
const { validarUsuario, validarLogin } = require('../utils/validar');

const router = express.Router();

// Contra fuerza bruta: máximo N intentos de login por IP cada 15 minutos.
const limitarLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.loginMaxAttempts,
  handler: (req, res) => {
    logEvent('LOGIN_BLOQUEADO', { ip: req.ip, detalle: 'Demasiados intentos' });
    res.status(429).json({ error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' });
  },
});

// POST /api/auth/register  -> crea una cuenta con rol "usuario"
router.post('/register', (req, res) => {
  const { nombre, email, password } = req.body || {};
  const errores = validarUsuario({ nombre, email, password });
  if (errores.length > 0) return res.status(400).json({ errores });

  // Consulta parametrizada (?): el dato nunca se pega dentro del SQL -> evita inyección SQL.
  const existe = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
  if (existe) return res.status(409).json({ error: 'El email ya está registrado' });

  // Bcrypt: se guarda el HASH de la contraseña, nunca la contraseña real.
  const hash = bcrypt.hashSync(password, config.bcryptRounds);

  // El rol siempre es "usuario": aunque el cliente envíe "rol": "admin", se ignora.
  const resultado = db
    .prepare('INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)')
    .run(nombre, email, hash, 'usuario');

  const id = Number(resultado.lastInsertRowid);
  logEvent('USUARIO_REGISTRADO', { usuarioId: id, email, ip: req.ip });
  res.status(201).json({ id, nombre, email, rol: 'usuario' });
});

// POST /api/auth/login  -> valida credenciales y devuelve un JWT
router.post('/login', limitarLogin, (req, res) => {
  const { email, password } = req.body || {};
  const errores = validarLogin({ email, password });
  if (errores.length > 0) return res.status(400).json({ errores });

  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);

  // bcrypt.compareSync compara la contraseña escrita con el hash guardado.
  const claveCorrecta = usuario && bcrypt.compareSync(password, usuario.password_hash);

  if (!claveCorrecta || !usuario.activo) {
    logEvent('LOGIN_FALLIDO', { email, ip: req.ip });
    // Mensaje genérico: no le decimos al atacante si falló el email o la contraseña.
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  // Se firma el token con el secreto del .env. Dentro va el id (sub) y el rol. Expira en 1h.
  const token = jwt.sign({ sub: String(usuario.id), rol: usuario.rol }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

  logEvent('LOGIN_EXITOSO', { usuarioId: usuario.id, email, ip: req.ip });
  res.json({
    token,
    usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
  });
});

// GET /api/auth/me  -> datos del usuario dueño del token
router.get('/me', autenticar, (req, res) => {
  res.json(req.usuario);
});

module.exports = router;
