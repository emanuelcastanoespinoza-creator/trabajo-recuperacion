# Preparación para la sustentación individual

> Practica respondiendo en voz alta **sin leer**. Para cada respuesta, sé capaz de abrir el archivo y señalar la línea.

## Preguntas probables y respuestas cortas

### Autenticación
- **¿Qué es un JWT y qué lleva dentro?** Un token firmado con tres partes (encabezado, datos, firma). Lleva `sub` (id del usuario), `rol` y `exp` (vence en 1 h). → `src/routes/auth.js`
- **¿Por qué no se puede falsificar?** Porque se firma con `JWT_SECRET` (en `.env`, ≥32 caracteres). Si alguien cambia el rol dentro del token, la firma ya no coincide y `jwt.verify` lo rechaza → 401.
- **¿Por qué `algorithms: ['HS256']`?** Para que no acepte tokens con `"alg": "none"` (sin firma).
- **¿Por qué Bcrypt y no SHA-256?** Bcrypt es lento a propósito (costo 12) y agrega *salt* automático; eso hace muy costoso adivinar contraseñas por fuerza bruta aunque roben la BD.
- **¿Por qué el mensaje "Credenciales inválidas" es genérico?** Para no revelar qué emails existen (enumeración de usuarios).
- **¿Por qué se consulta al usuario en cada petición si el token ya trae el rol?** Para que un cambio de rol o una desactivación apliquen al instante, sin esperar a que venza el token.

### Autorización
- **Diferencia entre 401 y 403:** 401 = no autenticado (sin token o token malo). 403 = autenticado pero sin permiso.
- **¿Cómo funciona `autorizar`?** Es una función que recibe los roles permitidos y devuelve un middleware; si `req.usuario.rol` no está en la lista, registra `ACCESO_DENEGADO` y responde 403. → `src/middleware/autorizar.js`
- **¿Cómo se evita que un usuario vea tickets ajenos?** Comparando `ticket.creado_por` con `req.usuario.id` (control de dueño del recurso / IDOR). → `src/routes/tickets.js` en `GET /:id`
- **¿Cómo se evita que alguien se registre como admin?** El registro siempre inserta `'usuario'`, ignora el `rol` que mande el cliente.

### Inyección SQL y validación
- **Explica una consulta:** `db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email)` → el `?` es un parámetro; SQLite trata el valor como **dato**, nunca como código SQL. Por eso `' OR 1=1 --` no funciona (prueba 15).
- **¿Para qué validar si ya hay consultas parametrizadas?** Defensa en profundidad: la validación evita datos basura/enormes y valores fuera de lista (rol, estado, prioridad). Además la BD tiene `CHECK`.

### Registro de eventos
- **Interpreta un hallazgo:** si en la bitácora ves muchos `LOGIN_FALLIDO` desde la misma IP seguidos de `LOGIN_BLOQUEADO`, es un intento de **fuerza bruta**; el límite lo detuvo. Muchos `ACCESO_DENEGADO` de un mismo usuario indican que intenta **escalar privilegios**.
- **¿Dónde se guardan?** En la tabla `audit_logs` y en `logs/security.log` (una línea JSON por evento).

### Backup y restauración (te pedirán explicarlo o hacerlo)
1. `npm run backup` → crea `backups/securedesk-<fecha>.db`.
2. Detener el servidor (`Ctrl + C`).
3. `npm run restore` (el más reciente) o `npm run restore -- backups/<archivo>.db`.
4. El script revisa `PRAGMA integrity_check`, guarda la base actual en `data/securedesk.db.antes-de-restaurar` (plan de reversa) y copia el backup.
5. `npm start` y verificar que los datos estén.
- **Si la restauración sale mal:** copiar `data/securedesk.db.antes-de-restaurar` de vuelta a `data/securedesk.db`.
- **RPO** 24 h · **RTO** 30 min.

### Transferencia a otro sistema
- "¿Cómo aplicarías esto en un sistema de inventario / historia clínica / notas?": mismos pasos → contraseñas con hash (Bcrypt/Argon2), sesión con token firmado, middleware que valida rol en cada ruta, revisar dueño del recurso, consultas parametrizadas (o un ORM), bitácora de eventos y backups probados. Solo cambian los roles y los recursos.

## Cambios en el código que pueden pedirte (practícalos)

| Te piden… | Dónde y qué cambiar |
|---|---|
| Que el token dure 30 min | `.env` → `JWT_EXPIRES_IN=30m` (o el valor por defecto en `src/config.js`) |
| Bajar el límite a 3 intentos | `.env` → `LOGIN_MAX_ATTEMPTS=3` |
| Que el técnico también pueda eliminar | `src/routes/tickets.js` → `autorizar('tecnico', 'admin')` en el `DELETE` |
| Agregar un rol nuevo (ej. `supervisor`) | `ROLES` en `src/utils/validar.js` + el `CHECK` en `src/db.js` + los `autorizar(...)` donde aplique |
| Exigir 10 caracteres en la contraseña | `passwordSegura` en `src/utils/validar.js` → `textoValido(p, 10, 72)` |
| Registrar un evento nuevo | llamar `logEvent('NOMBRE', { usuarioId, email, ip, detalle })` |

Después de cualquier cambio: `npm test` y `npm start` para demostrar que sigue funcionando.

## Comandos que debes saber de memoria

```bash
npm install      # dependencias
npm run seed     # usuarios y tickets de prueba
npm start        # http://localhost:3000
npm test         # 18 pruebas de seguridad
npm run backup
npm run restore
```
