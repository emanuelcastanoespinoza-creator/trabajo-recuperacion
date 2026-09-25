# SecureDesk ADSO

Mesa de ayuda (sistema de tickets de soporte) construida para demostrar controles de seguridad:
autenticación con **JWT**, contraseñas con **Bcrypt**, control de acceso por roles (**RBAC**),
validación de entradas, consultas parametrizadas, registro de eventos y **backup / restauración**.

- **Repositorio:** _(pega aquí el enlace de GitHub)_
- **Video:** _(pega aquí el enlace de YouTube)_
- **Fecha de sustentación:** _(fecha)_

## Tecnologías

| Pieza | Uso |
|---|---|
| Node.js 22.13+ y Express | Servidor y API REST |
| SQLite (`node:sqlite`, integrado en Node) | Base de datos en un solo archivo |
| bcryptjs | Hash de contraseñas |
| jsonwebtoken | Tokens de sesión (JWT) |
| helmet | Encabezados HTTP de seguridad |
| express-rate-limit | Límite de intentos de login |
| dotenv | Lectura de secretos desde `.env` |

## Instalación

```bash
git clone <url-del-repositorio>
cd securedesk-adso
npm install
cp .env.example .env          # en Windows: copy .env.example .env
```

Abre `.env` y cambia `JWT_SECRET` por un valor aleatorio. Puedes generarlo con:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Luego:

```bash
npm run seed    # crea los usuarios de prueba y tickets de ejemplo
npm start       # abre http://localhost:3000
```

## Usuarios de prueba

| Rol | Email | Contraseña |
|---|---|---|
| admin | admin@securedesk.local | Admin123* |
| tecnico | tecnico@securedesk.local | Tecnico123* |
| usuario | usuario@securedesk.local | Usuario123* |

> Son solo para pruebas. Las contraseñas se configuran en `.env` (`SEED_*`).

## Permisos por rol (RBAC)

| Acción | usuario | tecnico | admin |
|---|:-:|:-:|:-:|
| Crear ticket | ✅ | ✅ | ✅ |
| Ver sus propios tickets | ✅ | ✅ | ✅ |
| Ver todos los tickets | ❌ | ✅ | ✅ |
| Cambiar estado de un ticket | ❌ | ✅ | ✅ |
| Eliminar ticket | ❌ | ❌ | ✅ |
| Gestionar usuarios y roles | ❌ | ❌ | ✅ |
| Ver bitácora de seguridad | ❌ | ❌ | ✅ |

## API

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/auth/register` | Público (siempre crea rol `usuario`) |
| POST | `/api/auth/login` | Público (máx. 5 intentos / 15 min por IP) |
| GET | `/api/auth/me` | Con token |
| GET / POST | `/api/tickets` | Con token |
| GET | `/api/tickets/:id` | Dueño, tecnico o admin |
| PATCH | `/api/tickets/:id/estado` | tecnico, admin |
| DELETE | `/api/tickets/:id` | admin |
| GET / POST | `/api/usuarios` | admin |
| PATCH | `/api/usuarios/:id/rol` | admin |
| GET | `/api/logs` | admin |

## Estructura

```
src/
  config.js              configuración y secretos (desde .env)
  db.js                  conexión y tablas de SQLite
  app.js                 Express + helmet + rutas
  server.js              arranque
  middleware/
    autenticar.js        verifica el JWT
    autorizar.js         verifica el rol (RBAC)
  routes/                auth, tickets, usuarios, logs
  utils/
    logger.js            registro de eventos de seguridad
    validar.js           validación de entradas
scripts/                 seed, backup y restore
tests/                   pruebas de seguridad automáticas
public/                  interfaz web
docs/                    evidencias, checklist y análisis de riesgos
```

## Pruebas

```bash
npm test
```

Ejecuta 18 pruebas de seguridad (login, Bcrypt, JWT falso o vencido, 401/403, RBAC,
inyección SQL, validación y backup/restauración). Resultados en [docs/evidencias-pruebas.md](docs/evidencias-pruebas.md).

## Backup y restauración

```bash
npm run backup                          # crea backups/securedesk-<fecha>.db
npm run restore                         # restaura el backup más reciente
npm run restore -- backups/<archivo>.db # restaura uno específico
```

- Detén el servidor antes de restaurar.
- Antes de restaurar se guarda la base actual como `data/securedesk.db.antes-de-restaurar` (plan de reversa).
- En Linux también se puede usar `scripts/backup.sh` y `scripts/restore.sh` (por ejemplo con cron).

## Registro de eventos

Los eventos se guardan en la tabla `audit_logs` y en `logs/security.log`:
`LOGIN_EXITOSO`, `LOGIN_FALLIDO`, `LOGIN_BLOQUEADO`, `TOKEN_INVALIDO`, `ACCESO_DENEGADO`,
`USUARIO_REGISTRADO`, `USUARIO_CREADO`, `ROL_CAMBIADO`, `TICKET_CREADO`, `TICKET_ESTADO`, `TICKET_ELIMINADO`.
