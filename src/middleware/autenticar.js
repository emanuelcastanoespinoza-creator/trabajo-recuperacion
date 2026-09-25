// MIDDLEWARE DE AUTENTICACIÓN: revisa que la petición traiga un JWT válido.
// El cliente lo envía así:  Authorization: Bearer <token>
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');
const { logEvent } = require('../utils/logger');

function autenticar(req, res, next) {
  const encabezado = req.headers.authorization || '';
  const token = encabezado.startsWith('Bearer ') ? encabezado.slice(7) : null;

  // 1. Sin token -> 401 (no autenticado)
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  // 2. Verificar la firma y la expiración del token con el secreto del .env.
  //    Solo se acepta HS256 (bloquea tokens falsos con "alg": "none").
  let datos;
  try {
    datos = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
  } catch (error) {
    logEvent('TOKEN_INVALIDO', { ip: req.ip, detalle: error.message });
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  // 3. Buscar al usuario en la base de datos. Así, si el admin le cambia el rol
  //    o lo desactiva, el cambio aplica de inmediato.
  const usuario = db.prepare('SELECT id, nombre, email, rol, activo FROM usuarios WHERE id = ?').get(Number(datos.sub));
  if (!usuario || !usuario.activo) return res.status(401).json({ error: 'Usuario no válido' });

  // 4. Guardar el usuario en la petición para que lo usen las siguientes funciones.
  req.usuario = usuario;
  next();
}

module.exports = autenticar;
