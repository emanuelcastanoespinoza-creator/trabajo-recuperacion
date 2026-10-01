# Guion del video técnico — SecureDesk ADSO (15 a 20 min)

> No leas esto palabra por palabra: úsalo como mapa. En cada bloque **muestra el código en VS Code**
> y explica *qué hace* y *por qué se decidió así*. Tiempo objetivo: ~18 min.

## Antes de grabar (preparación)

1. Abre **VS Code** con la carpeta del proyecto y sube el tamaño de letra (`Ctrl` + `+`, unas 3 veces).
2. Abre una **terminal** en VS Code y deja el servidor apagado.
3. Reinicia los datos para que la demo salga limpia:
   ```bash
   npm run seed
   ```
4. Abre **Chrome** en una pestaña vacía (después irás a `http://localhost:3000`).
5. Cierra WhatsApp, notificaciones y cualquier pestaña con datos personales.
6. Ten **abierto el archivo `.env` solo en tu cabeza**, no en pantalla (es un secreto).
   Si lo muestras, enseña `.env.example`, no `.env`.
7. Herramienta para grabar (cualquiera):
   - **Xbox Game Bar** (`Win + G` → botón grabar, o `Win + Alt + R`). Ya viene en Windows, pero solo graba una ventana.
   - **OBS Studio** (gratis, obsproject.com): agrega fuente *Captura de pantalla* + *Micrófono*. Recomendado porque graba toda la pantalla y puedes cambiar entre VS Code y Chrome.
   - **Clipchamp** (viene en Windows 11) → *Grabar* → *Pantalla y cámara*.

---

## 1. Presentación y problema — (0:00 – 1:30)

- "Hola, soy **Emanuel Castaño Espinoza**, aprendiz ADSO. Este es el proyecto **SecureDesk ADSO**."
- **Problema:** una mesa de ayuda guarda datos de personas y de soporte. Si no tiene seguridad:
  cualquiera podría entrar con fuerza bruta, ver tickets ajenos, volverse administrador,
  robar contraseñas de la base de datos o perder toda la información sin poder recuperarla.
- **Objetivo:** construir la mesa de ayuda aplicando autenticación, autorización por roles,
  validación, registro de eventos y backups.
- Muestra el `README.md` (tabla de tecnologías) unos segundos.

## 2. Arquitectura — (1:30 – 3:00)

Muestra el diagrama de `docs/analisis-riesgos.md`:

```
Navegador (public/) --HTTP + JWT--> Express (src/app.js)
                                      ├─ helmet
                                      ├─ autenticar.js (JWT)
                                      ├─ autorizar.js (rol)
                                      ├─ rutas: auth, tickets, usuarios, logs
                                      └─ SQLite (data/securedesk.db) + backups/
```

- **Por qué Node + Express:** API REST simple y middlewares que se encadenan (primero autenticar, luego autorizar).
- **Por qué SQLite (`node:sqlite`):** un solo archivo, fácil de respaldar y restaurar, sin instalar un servidor de BD.
- Recorre la **estructura de carpetas** (`src/`, `middleware/`, `routes/`, `utils/`, `scripts/`, `tests/`, `docs/`).

## 3. Configuración y secretos — (3:00 – 4:00)

Abre `src/config.js`:
- Los secretos vienen de `.env` (variables de entorno), **nunca** del código.
- Si `JWT_SECRET` falta o tiene menos de 32 caracteres, **la app no arranca** (falla segura).
- Muestra `.gitignore`: `.env`, `data/`, `backups/` y `logs/` **no** se suben a GitHub.
- Muestra `.env.example` como plantilla.

Abre `src/app.js`:
- `helmet()` → encabezados de seguridad (CSP, X-Frame-Options).
- `x-powered-by` desactivado → no revelamos que es Express.
- `express.json({ limit: '10kb' })` → rechaza peticiones gigantes.
- El manejador de errores **nunca** devuelve el detalle interno al cliente.

## 4. Flujo de autenticación — (4:00 – 7:00)

Abre `src/routes/auth.js` y explica en orden:

1. **Registro** (`POST /api/auth/register`):
   - Valida datos con `validarUsuario` (contraseña: 8+ caracteres, mayúscula, minúscula, número, símbolo).
   - Consulta **parametrizada** con `?` para revisar si el email existe.
   - `bcrypt.hashSync(password, 12)` → se guarda el **hash**, nunca la contraseña.
   - **Decisión clave:** el rol siempre es `usuario`. Aunque alguien envíe `"rol": "admin"`, se ignora (evita escalada de privilegios).
2. **Login** (`POST /api/auth/login`):
   - `limitarLogin` → máximo 5 intentos fallidos por IP en 15 min → luego 429 y evento `LOGIN_BLOQUEADO`.
   - `bcrypt.compareSync` compara la contraseña con el hash.
   - **Mensaje genérico** "Credenciales inválidas": no se le dice al atacante si falló el email o la clave.
   - `jwt.sign({ sub, rol }, secreto, { expiresIn: '1h' })` → token que expira en 1 hora.
3. **Middleware `autenticar.js`** (muéstralo completo):
   - Lee `Authorization: Bearer <token>`. Sin token → **401**.
   - `jwt.verify(..., { algorithms: ['HS256'] })` → bloquea tokens falsos y el truco `alg: none`.
   - Busca al usuario en la BD en **cada** petición: si el admin lo desactiva o le cambia el rol, aplica de inmediato.
4. En el frontend (`public/app.js`): el token se guarda en `sessionStorage` (se borra al cerrar la pestaña).

## 5. Autorización por roles (RBAC) — (7:00 – 9:00)

Muestra la tabla de permisos del `README.md` y luego `src/middleware/autorizar.js`:
- `autorizar('tecnico', 'admin')` recibe los roles permitidos. Si no tiene el rol → **403** y se registra `ACCESO_DENEGADO`.
- **Diferencia 401 vs 403:** 401 = no sé quién eres; 403 = sé quién eres pero no tienes permiso.

Abre `src/routes/tickets.js`:
- `router.use(autenticar)` → todas las rutas de tickets exigen login.
- `GET /` → el `usuario` solo ve sus tickets (`WHERE creado_por = ?`); técnico y admin ven todos.
- `GET /:id` → control de **dueño del recurso**: un usuario no puede ver el ticket de otro (evita IDOR).
- `PATCH /:id/estado` → `autorizar('tecnico','admin')`.
- `DELETE /:id` → `autorizar('admin')`.

Abre `src/routes/usuarios.js`:
- `router.use(autenticar, autorizar('admin'))` → todo el módulo es solo admin.
- El listado **no devuelve** `password_hash`.
- El admin **no puede cambiarse su propio rol** (el sistema no se queda sin administrador).

## 6. Otros controles de seguridad — (9:00 – 10:30)

- **Validación** (`src/utils/validar.js`): listas blancas para rol, prioridad y estado; largos mínimos y máximos.
- **Inyección SQL:** todas las consultas usan `?` (muestra cualquier `db.prepare`). El dato nunca se pega dentro del SQL.
- **Base de datos** (`src/db.js`): `CHECK` en rol/prioridad/estado, `UNIQUE` en email → defensa también en la BD.
- **XSS:** el frontend usa `textContent`, no `innerHTML`, para pintar datos + CSP de helmet.
- **Registro de eventos** (`src/utils/logger.js`): cada evento va a la tabla `audit_logs` **y** a `logs/security.log`. Es un control **detectivo**.
- Clasificación: **preventivos** (Bcrypt, JWT, RBAC, validación…), **detectivos** (bitácora), **correctivos** (backup/restore).

## 7. Backup y restauración — (10:30 – 12:00)

Muestra `scripts/restore.js` y explica los 3 pasos:
1. `PRAGMA integrity_check` → no se restaura un backup dañado.
2. **Plan de reversa:** copia la base actual a `data/securedesk.db.antes-de-restaurar`.
3. Reemplaza la base con el backup.

Demostración en la terminal (servidor apagado):
```bash
npm run backup
npm run restore
```
- **RPO** 24 h (backup diario) · **RTO** 30 min.

## 8. Pruebas ejecutadas y resultados — (12:00 – 13:30)

```bash
npm test
```
- Muestra que pasan las **18 pruebas** (`pass 18`, `fail 0`).
- Abre `tests/seguridad.test.js` y explica 3 o 4: login correcto (1), token alterado → 401 (7),
  usuario a ruta de admin → 403 (9), inyección SQL `' OR 1=1 --` no funciona (15), backup y restauración (18).
- Menciona `docs/evidencias-pruebas.md` y las capturas en `docs/capturas/`.

## 9. Demostración funcional — (13:30 – 17:00)

```bash
npm start
```
Abre `http://localhost:3000`:

1. **Login fallido** con una clave mala → "Credenciales inválidas".
2. **Usuario** (`usuario@securedesk.local` / `Usuario123*`): crea un ticket, ve solo los suyos.
3. **Técnico** (`tecnico@securedesk.local` / `Tecnico123*`): ve todos y cambia el estado de un ticket.
   Intenta eliminar → **403**.
4. **Admin** (`admin@securedesk.local` / `Admin123*`): lista usuarios, cambia un rol, elimina un ticket
   y abre la **bitácora** donde aparecen `LOGIN_FALLIDO`, `ACCESO_DENEGADO`, `ROL_CAMBIADO`.
5. (Opcional) En la terminal muestra `logs/security.log`.
6. (Opcional) Haz 6 logins fallidos seguidos → mensaje de bloqueo (429).

## 10. Riesgos pendientes y cierre — (17:00 – 18:30)

- Sin **HTTPS** en local → en producción iría detrás de un proxy (Nginx) con certificado.
- Los backups quedan en el **mismo equipo** → faltaría copiarlos a otro lugar (nube o disco externo).
- **No hay revocación** de tokens antes de que venzan → mitigado con expiración de 1 h y revisión del usuario en cada petición.
- El límite de intentos se guarda en memoria → si se reinicia el servidor se reinicia el contador.
- **Transferencia:** estos mismos controles (hash, JWT, middleware de roles, consultas parametrizadas, bitácora, backups) se aplican igual en cualquier otro sistema (Java/Spring, PHP/Laravel, Python/Django).
- "Gracias. El repositorio y este video están enlazados en el documento."
