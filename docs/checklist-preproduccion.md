# Checklist preproducción — SecureDesk ADSO

Revisión antes de poner el sistema en producción. Marca cada punto después de comprobarlo.

## Secretos y configuración
- [x] `.env` está en `.gitignore` y no aparece en el historial de Git (`git log --all -- .env` no muestra nada).
- [x] `.env.example` solo tiene valores de ejemplo.
- [x] `JWT_SECRET` tiene 32 caracteres o más; si falta, la app no arranca.
- [ ] En producción se cambió `JWT_SECRET` por uno nuevo y aleatorio.
- [ ] En producción se cambiaron o eliminaron los usuarios de prueba.

## Autenticación
- [x] Contraseñas guardadas con Bcrypt (costo 12). Prueba 3.
- [x] Política de contraseña: 8+ caracteres, mayúscula, minúscula, número y símbolo. Prueba 4.
- [x] Mensaje genérico "Credenciales inválidas" (no revela si el email existe). Prueba 2.
- [x] Límite de 5 intentos de login por IP cada 15 minutos.
- [x] El JWT expira en 1 hora y solo se acepta el algoritmo HS256. Pruebas 7 y 8.

## Autorización (RBAC)
- [x] Toda ruta de tickets, usuarios y logs exige token. Prueba 6.
- [x] Rutas de admin responden 403 a otros roles. Prueba 9.
- [x] Un usuario no puede ver tickets de otros. Prueba 12.
- [x] El registro público no permite elegir rol. Prueba 5.
- [x] Un cambio de rol aplica de inmediato. Prueba 14.

## Entradas y datos
- [x] Todas las consultas SQL son parametrizadas (`?`). Pruebas 15 y 16.
- [x] Validación de longitud y formato en todos los campos. Prueba 17.
- [x] Cuerpo de las peticiones limitado a 10 KB.
- [x] Las respuestas nunca incluyen `password_hash`. Prueba 10.
- [x] La interfaz usa `textContent` en lugar de `innerHTML` para los datos (evita XSS).
- [x] Encabezados de seguridad con helmet (CSP, X-Frame-Options, etc.).
- [x] Los errores internos no se muestran al cliente.

## Registro y monitoreo
- [x] Se registran logins exitosos y fallidos, bloqueos, tokens inválidos, accesos denegados y cambios de rol.
- [x] Los logs están en la base (`audit_logs`) y en archivo (`logs/security.log`).
- [ ] Definir quién revisa los logs y cada cuánto.

## Backup y continuidad
- [x] `npm run backup` crea una copia con fecha. Prueba 18.
- [x] `npm run restore` verifica la integridad del backup antes de usarlo.
- [x] La restauración guarda la base anterior (plan de reversa).
- [x] Restauración probada manualmente (ver evidencias).
- [ ] Programar el backup automático diario (cron o Programador de tareas).
- [ ] Guardar copias de los backups fuera del servidor.

## Dependencias
- [x] `npm audit` sin vulnerabilidades.
- [ ] En producción usar HTTPS (proxy como Nginx con certificado).
