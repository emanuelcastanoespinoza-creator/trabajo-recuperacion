# Evidencias de pruebas — SecureDesk ADSO

Fecha de ejecución: 25 de septiembre de 2026 · Node.js v24.14.0

## 1. Pruebas automáticas (`npm test`)

Resultado: **18 de 18 pruebas aprobadas**.

| # | Prueba | Resultado esperado | Control que demuestra | Estado |
|---|---|---|---|---|
| 1 | Login correcto | 200 + token JWT | Autenticación | ✅ |
| 2 | Contraseña incorrecta | 401 "Credenciales inválidas" + evento `LOGIN_FALLIDO` | Autenticación + registro | ✅ |
| 3 | Contraseña en la base | Hash `$2a$...`, nunca texto plano | Bcrypt | ✅ |
| 4 | Registro con clave `123456` | 400 | Política de contraseñas | ✅ |
| 5 | Registro enviando `rol: admin` | Se crea como `usuario` | Evita escalar privilegios | ✅ |
| 6 | Ruta protegida sin token | 401 | JWT obligatorio | ✅ |
| 7 | Token firmado con otro secreto | 401 | Firma del JWT | ✅ |
| 8 | Token vencido | 401 | Expiración del JWT | ✅ |
| 9 | Usuario entra a `/api/usuarios` | 403 + evento `ACCESO_DENEGADO` | RBAC + registro | ✅ |
| 10 | Admin lista usuarios | 200 sin `password_hash` | Confidencialidad | ✅ |
| 11 | Usuario/técnico cambian estado | 403 / 200 | RBAC | ✅ |
| 12 | Usuario abre ticket ajeno | 403 | Control de acceso a objetos | ✅ |
| 13 | Técnico elimina ticket | 403 | RBAC | ✅ |
| 14 | Admin cambia rol | Evento `ROL_CAMBIADO` y aplica de inmediato | RBAC + registro | ✅ |
| 15 | Login con `' OR 1=1 --` | 400/401, sin token | Anti inyección SQL | ✅ |
| 16 | Ticket con `'); DROP TABLE usuarios; --` | Se guarda como texto; tabla intacta | Consultas parametrizadas | ✅ |
| 17 | Ticket con datos inválidos | 400 | Validación de entradas | ✅ |
| 18 | Backup → borrar → restaurar | Dato recuperado | Backup y restauración | ✅ |

Salida de la consola:

```
✔ 1. Login correcto devuelve un JWT
✔ 2. Login con contraseña incorrecta -> 401 y queda en el log
✔ 3. Las contraseñas se guardan con Bcrypt (no en texto plano)
✔ 4. Registro rechaza contraseñas débiles
✔ 5. Registro ignora el rol enviado: no se puede crear un admin
✔ 6. Ruta protegida sin token -> 401
✔ 7. Token alterado (firma falsa) -> 401
✔ 8. Token expirado -> 401
✔ 9. Usuario normal intenta entrar a ruta de admin -> 403 y queda en el log
✔ 10. Admin sí puede ver usuarios y la respuesta no incluye hashes
✔ 11. Usuario no puede cambiar el estado de un ticket (403); técnico sí (200)
✔ 12. Usuario no puede ver tickets de otra persona
✔ 13. Técnico no puede eliminar tickets (solo admin)
✔ 14. Cambio de rol queda registrado y aplica de inmediato
✔ 15. Inyección SQL en el login (' OR 1=1 --) no funciona
✔ 16. Inyección SQL en un ticket se guarda como texto y no borra nada
✔ 17. Datos inválidos en un ticket -> 400
✔ 18. Backup y restauración recuperan los datos
ℹ tests 18
ℹ pass 18
ℹ fail 0
```

## 2. Prueba manual de backup y restauración

1. `npm run backup` → `Backup creado en: backups/securedesk-2026-09-25T20-01-33.db`
2. Tickets en la base: **3**
3. Simulación de desastre: se borran todos los tickets → **0**
4. Se detiene el servidor y se ejecuta `npm run restore`:
   ```
   Base de datos restaurada desde: backups/securedesk-2026-09-25T20-01-33.db
   La base anterior quedó guardada en: data/securedesk.db.antes-de-restaurar
   ```
5. Tickets en la base: **3** → datos recuperados.

## 3. Pruebas en el navegador

_(Agrega aquí tus capturas: login fallido, vista de cada rol, bitácora del admin, etc.)_

## 4. Hallazgos y correcciones

| Hallazgo | Riesgo | Corrección |
|---|---|---|
| El registro público podía recibir un campo `rol` | Un atacante se crea como admin | El rol se fija en `usuario` en el servidor (prueba 5) |
| Un token seguía teniendo el rol antiguo después de un cambio de rol | Permisos viejos hasta que vence el token | El middleware lee el rol actual desde la base en cada petición (prueba 14) |
| Sin límite de intentos de login | Fuerza bruta de contraseñas | `express-rate-limit`: 5 intentos / 15 min por IP |
| El admin podía quitarse su propio rol | Sistema sin administrador | Se bloquea cambiar el propio rol |
