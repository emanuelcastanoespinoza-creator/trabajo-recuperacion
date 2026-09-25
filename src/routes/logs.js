// BITÁCORA DE SEGURIDAD: solo el admin puede ver los eventos registrados.
const express = require('express');
const db = require('../db');
const autenticar = require('../middleware/autenticar');
const autorizar = require('../middleware/autorizar');

const router = express.Router();

// GET /api/logs  -> últimos 100 eventos
router.get('/', autenticar, autorizar('admin'), (req, res) => {
  res.json(db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100').all());
});

module.exports = router;
