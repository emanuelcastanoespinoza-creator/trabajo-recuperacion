// Configuración de Express: middlewares de seguridad, rutas y manejo de errores.
const path = require('path');
const express = require('express');
const helmet = require('helmet');

const app = express();

app.disable('x-powered-by');
app.use(helmet()); // Encabezados de seguridad (CSP, X-Frame-Options, etc.)
app.use(express.json({ limit: '10kb' })); // Rechaza cuerpos enormes
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/logs', require('./routes/logs'));

app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Nunca se envía el detalle interno del error al cliente (evita filtrar información).
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON mal formado' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Petición demasiado grande' });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
