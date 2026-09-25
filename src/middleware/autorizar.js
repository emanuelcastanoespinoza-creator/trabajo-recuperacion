// MIDDLEWARE DE AUTORIZACIÓN (RBAC = control de acceso basado en roles).
// Se usa después de autenticar, indicando qué roles pueden entrar:
//   router.delete('/:id', autorizar('admin'), ...)
const { logEvent } = require('../utils/logger');

function autorizar(...rolesPermitidos) {
  return (req, res, next) => {
    if (rolesPermitidos.includes(req.usuario.rol)) {
      return next(); // Tiene el rol: puede continuar.
    }

    // No tiene el rol -> se registra el intento y se responde 403 (prohibido).
    logEvent('ACCESO_DENEGADO', {
      usuarioId: req.usuario.id,
      email: req.usuario.email,
      ip: req.ip,
      detalle: `${req.method} ${req.originalUrl} requiere ${rolesPermitidos.join(' o ')}, tiene ${req.usuario.rol}`,
    });
    res.status(403).json({ error: 'No tienes permiso para esta acción' });
  };
}

module.exports = autorizar;
