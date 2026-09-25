// PRUEBAS DE SEGURIDAD. Ejecutar con: npm test
// Usan una base de datos temporal, así no tocan los datos reales.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Configuración de prueba (antes de cargar la app).
const carpetaTemporal = fs.mkdtempSync(path.join(os.tmpdir(), 'securedesk-test-'));
process.env.JWT_SECRET = 'secreto-solo-para-pruebas-con-mas-de-32-caracteres';
process.env.DB_PATH = path.join(carpetaTemporal, 'test.db');
process.env.LOG_PATH = path.join(carpetaTemporal, 'test.log');
process.env.BACKUP_DIR = path.join(carpetaTemporal, 'backups');
process.env.BCRYPT_ROUNDS = '4'; // más rápido en pruebas
process.env.LOGIN_MAX_ATTEMPTS = '100';

const jwt = require('jsonwebtoken');
const app = require('../src/app');
const db = require('../src/db');
const { seed } = require('../scripts/seed');

let servidor;
let URL_BASE;

// Función de ayuda para llamar a la API.
async function pedir(metodo, ruta, { token, cuerpo } = {}) {
  const respuesta = await fetch(URL_BASE + ruta, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const datos = respuesta.status === 204 ? null : await respuesta.json();
  return { status: respuesta.status, datos };
}

async function login(email, password) {
  const { datos } = await pedir('POST', '/api/auth/login', { cuerpo: { email, password } });
  return datos.token;
}

const ultimoEvento = (evento) =>
  db.prepare('SELECT * FROM audit_logs WHERE evento = ? ORDER BY id DESC LIMIT 1').get(evento);

let tokenAdmin, tokenTecnico, tokenUsuario;

before(async () => {
  seed();
  servidor = app.listen(0);
  URL_BASE = `http://localhost:${servidor.address().port}`;
  tokenAdmin = await login('admin@securedesk.local', 'Admin123*');
  tokenTecnico = await login('tecnico@securedesk.local', 'Tecnico123*');
  tokenUsuario = await login('usuario@securedesk.local', 'Usuario123*');
});

after(() => servidor.close());

// ---------------- Autenticación ----------------

test('1. Login correcto devuelve un JWT', async () => {
  const { status, datos } = await pedir('POST', '/api/auth/login', {
    cuerpo: { email: 'admin@securedesk.local', password: 'Admin123*' },
  });
  assert.strictEqual(status, 200);
  assert.ok(datos.token);
});

test('2. Login con contraseña incorrecta -> 401 y queda en el log', async () => {
  const { status, datos } = await pedir('POST', '/api/auth/login', {
    cuerpo: { email: 'admin@securedesk.local', password: 'ClaveMala1!' },
  });
  assert.strictEqual(status, 401);
  assert.strictEqual(datos.error, 'Credenciales inválidas');
  assert.strictEqual(ultimoEvento('LOGIN_FALLIDO').email, 'admin@securedesk.local');
});

test('3. Las contraseñas se guardan con Bcrypt (no en texto plano)', () => {
  const fila = db.prepare('SELECT password_hash FROM usuarios WHERE email = ?').get('admin@securedesk.local');
  assert.notStrictEqual(fila.password_hash, 'Admin123*');
  assert.match(fila.password_hash, /^\$2[aby]\$/); // formato de hash bcrypt
});

test('4. Registro rechaza contraseñas débiles', async () => {
  const { status } = await pedir('POST', '/api/auth/register', {
    cuerpo: { nombre: 'Pedro', email: 'pedro@test.com', password: '123456' },
  });
  assert.strictEqual(status, 400);
});

test('5. Registro ignora el rol enviado: no se puede crear un admin', async () => {
  const { status, datos } = await pedir('POST', '/api/auth/register', {
    cuerpo: { nombre: 'Atacante', email: 'atacante@test.com', password: 'Segura123*', rol: 'admin' },
  });
  assert.strictEqual(status, 201);
  assert.strictEqual(datos.rol, 'usuario');
});

// ---------------- JWT ----------------

test('6. Ruta protegida sin token -> 401', async () => {
  const { status } = await pedir('GET', '/api/tickets');
  assert.strictEqual(status, 401);
});

test('7. Token alterado (firma falsa) -> 401', async () => {
  const falso = jwt.sign({ sub: '1', rol: 'admin' }, 'otro-secreto-que-no-es-el-del-servidor');
  const { status } = await pedir('GET', '/api/tickets', { token: falso });
  assert.strictEqual(status, 401);
});

test('8. Token expirado -> 401', async () => {
  const vencido = jwt.sign({ sub: '1', rol: 'admin' }, process.env.JWT_SECRET, { expiresIn: '-1s' });
  const { status } = await pedir('GET', '/api/tickets', { token: vencido });
  assert.strictEqual(status, 401);
});

// ---------------- RBAC ----------------

test('9. Usuario normal intenta entrar a ruta de admin -> 403 y queda en el log', async () => {
  const { status } = await pedir('GET', '/api/usuarios', { token: tokenUsuario });
  assert.strictEqual(status, 403);
  assert.strictEqual(ultimoEvento('ACCESO_DENEGADO').email, 'usuario@securedesk.local');
});

test('10. Admin sí puede ver usuarios y la respuesta no incluye hashes', async () => {
  const { status, datos } = await pedir('GET', '/api/usuarios', { token: tokenAdmin });
  assert.strictEqual(status, 200);
  assert.ok(datos.every((u) => u.password_hash === undefined));
});

test('11. Usuario no puede cambiar el estado de un ticket (403); técnico sí (200)', async () => {
  const cuerpo = { estado: 'en_proceso' };
  assert.strictEqual((await pedir('PATCH', '/api/tickets/1/estado', { token: tokenUsuario, cuerpo })).status, 403);
  assert.strictEqual((await pedir('PATCH', '/api/tickets/1/estado', { token: tokenTecnico, cuerpo })).status, 200);
});

test('12. Usuario no puede ver tickets de otra persona', async () => {
  // El ticket 3 lo creó el técnico en el seed.
  const { status } = await pedir('GET', '/api/tickets/3', { token: tokenUsuario });
  assert.strictEqual(status, 403);
});

test('13. Técnico no puede eliminar tickets (solo admin)', async () => {
  assert.strictEqual((await pedir('DELETE', '/api/tickets/2', { token: tokenTecnico })).status, 403);
});

test('14. Cambio de rol queda registrado y aplica de inmediato', async () => {
  const nuevo = await pedir('POST', '/api/usuarios', {
    token: tokenAdmin,
    cuerpo: { nombre: 'Laura', email: 'laura@test.com', password: 'Laura123*', rol: 'usuario' },
  });
  const tokenLaura = await login('laura@test.com', 'Laura123*');

  await pedir('PATCH', `/api/usuarios/${nuevo.datos.id}/rol`, { token: tokenAdmin, cuerpo: { rol: 'tecnico' } });
  assert.match(ultimoEvento('ROL_CAMBIADO').detalle, /laura@test.com: usuario -> tecnico/);

  // Con el MISMO token, Laura ya tiene permisos de técnico.
  const { status } = await pedir('PATCH', '/api/tickets/1/estado', { token: tokenLaura, cuerpo: { estado: 'cerrado' } });
  assert.strictEqual(status, 200);
});

// ---------------- Validación e inyección SQL ----------------

test("15. Inyección SQL en el login (' OR 1=1 --) no funciona", async () => {
  const { status, datos } = await pedir('POST', '/api/auth/login', {
    cuerpo: { email: "' OR 1=1 --", password: "' OR 1=1 --" },
  });
  assert.ok(status === 400 || status === 401);
  assert.strictEqual(datos.token, undefined);
});

test('16. Inyección SQL en un ticket se guarda como texto y no borra nada', async () => {
  const ataque = "Hola'); DROP TABLE usuarios; --";
  const { status, datos } = await pedir('POST', '/api/tickets', {
    token: tokenUsuario,
    cuerpo: { titulo: ataque, descripcion: 'Probando inyección SQL en el título', prioridad: 'baja' },
  });
  assert.strictEqual(status, 201);
  assert.strictEqual(datos.titulo, ataque); // se guardó tal cual, como texto
  assert.ok(db.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n > 0); // la tabla sigue existiendo
});

test('17. Datos inválidos en un ticket -> 400', async () => {
  const { status } = await pedir('POST', '/api/tickets', {
    token: tokenUsuario,
    cuerpo: { titulo: 'x', descripcion: '', prioridad: 'urgentisima' },
  });
  assert.strictEqual(status, 400);
});

// ---------------- Backup y restauración ----------------

test('18. Backup y restauración recuperan los datos', () => {
  const { crearBackup } = require('../scripts/backup');
  const { restaurar } = require('../scripts/restore');
  const { DatabaseSync } = require('node:sqlite');

  // Base de datos aparte con un dato.
  const dbPrueba = path.join(carpetaTemporal, 'restaurar.db');
  let conexion = new DatabaseSync(dbPrueba);
  conexion.exec("CREATE TABLE datos (valor TEXT); INSERT INTO datos VALUES ('importante')");
  conexion.close();

  const backup = crearBackup(dbPrueba, process.env.BACKUP_DIR);

  // Simular un desastre: se borra el dato.
  conexion = new DatabaseSync(dbPrueba);
  conexion.exec('DELETE FROM datos');
  conexion.close();

  restaurar(backup, dbPrueba);

  conexion = new DatabaseSync(dbPrueba);
  const fila = conexion.prepare('SELECT valor FROM datos').get();
  conexion.close();
  assert.strictEqual(fila.valor, 'importante');
});
