// VALIDACIÓN DE ENTRADAS. Cada función devuelve una lista de errores.
// Si la lista está vacía, los datos son válidos.
const ROLES = ['admin', 'tecnico', 'usuario'];
const PRIORIDADES = ['baja', 'media', 'alta'];
const ESTADOS = ['abierto', 'en_proceso', 'cerrado'];

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Revisa que sea texto y que su largo esté entre min y max.
function textoValido(valor, min, max) {
  return typeof valor === 'string' && valor.trim().length >= min && valor.length <= max;
}

// Contraseña segura: mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo.
function passwordSegura(p) {
  return textoValido(p, 8, 72) && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p);
}

function validarUsuario({ nombre, email, password, rol }, validarRol = false) {
  const errores = [];
  if (!textoValido(nombre, 3, 60)) errores.push('nombre debe tener entre 3 y 60 caracteres');
  if (!textoValido(email, 5, 100) || !EMAIL_VALIDO.test(email)) errores.push('email no es válido');
  if (!passwordSegura(password)) errores.push('password: mínimo 8 caracteres con mayúscula, minúscula, número y símbolo');
  if (validarRol && !ROLES.includes(rol)) errores.push('rol debe ser: ' + ROLES.join(', '));
  return errores;
}

function validarLogin({ email, password }) {
  const errores = [];
  if (!textoValido(email, 5, 100) || !EMAIL_VALIDO.test(email)) errores.push('email no es válido');
  if (!textoValido(password, 1, 72)) errores.push('password es obligatorio');
  return errores;
}

function validarTicket({ titulo, descripcion, prioridad }) {
  const errores = [];
  if (!textoValido(titulo, 5, 100)) errores.push('titulo debe tener entre 5 y 100 caracteres');
  if (!textoValido(descripcion, 10, 1000)) errores.push('descripcion debe tener entre 10 y 1000 caracteres');
  if (!PRIORIDADES.includes(prioridad)) errores.push('prioridad debe ser: ' + PRIORIDADES.join(', '));
  return errores;
}

module.exports = { validarUsuario, validarLogin, validarTicket, ROLES, ESTADOS };
