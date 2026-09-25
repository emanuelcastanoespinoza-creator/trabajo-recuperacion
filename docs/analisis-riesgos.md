# Análisis de riesgos — SecureDesk ADSO (borrador para el documento)

> Base para el PDF. Reescríbelo con tus palabras y agrega capturas.

## Arquitectura

```
Navegador (public/)  --HTTP + JWT-->  Express (src/app.js)
                                        ├─ helmet (encabezados)
                                        ├─ autenticar.js (JWT)
                                        ├─ autorizar.js (rol)
                                        ├─ rutas: auth, tickets, usuarios, logs
                                        └─ SQLite (data/securedesk.db)
                                               ├─ usuarios, tickets, audit_logs
                                               └─ backups/ (npm run backup)
```

## Activos

| Activo | Por qué importa |
|---|---|
| Base de datos (usuarios y tickets) | Contiene información de personas y de soporte |
| Contraseñas (hashes) | Si se filtran en texto plano, se roban cuentas |
| `JWT_SECRET` | Con él cualquiera puede fabricar tokens de admin |
| Logs de seguridad | Evidencia para detectar e investigar ataques |
| Backups | Única forma de recuperar datos después de un daño |

## Matriz de riesgos (probabilidad × impacto, escala 1–3)

| Amenaza | Vulnerabilidad | P | I | Riesgo | Control |
|---|---|:-:|:-:|:-:|---|
| Fuerza bruta al login | Contraseñas débiles, intentos ilimitados | 3 | 3 | **9 Alto** | Política de claves + límite de intentos + log |
| Inyección SQL | SQL armado con texto del usuario | 2 | 3 | **6 Alto** | Consultas parametrizadas + validación |
| Robo de base de datos | Contraseñas en texto plano | 2 | 3 | **6 Alto** | Bcrypt (costo 12) |
| Token falsificado | Secreto débil o expuesto en el código | 2 | 3 | **6 Alto** | Secreto en `.env`, ≥32 caracteres, solo HS256 |
| Escalada de privilegios | Rutas sin validar rol | 2 | 3 | **6 Alto** | Middleware RBAC + rol fijo al registrarse |
| Ver tickets ajenos | Sin revisar al dueño del recurso | 2 | 2 | **4 Medio** | Revisión de `creado_por` |
| Pérdida de datos | Sin copias de seguridad | 2 | 3 | **6 Alto** | Backup + restauración probada |
| Ataque no detectado | Sin registro de eventos | 2 | 2 | **4 Medio** | Bitácora `audit_logs` + archivo |
| XSS en la interfaz | Mostrar datos con `innerHTML` | 1 | 2 | **2 Bajo** | `textContent` + CSP de helmet |

## Triada CID

- **Confidencialidad:** Bcrypt, JWT, RBAC, un usuario solo ve sus tickets, nunca se devuelve el hash.
- **Integridad:** validación de entradas, consultas parametrizadas, solo técnico/admin cambian estados, `integrity_check` antes de restaurar.
- **Disponibilidad:** backups, restauración probada, plan de reversa, límite de tamaño de peticiones.

## Controles por tipo

| Preventivos | Detectivos | Correctivos |
|---|---|---|
| Bcrypt, JWT, RBAC, validación, consultas parametrizadas, límite de intentos, helmet | Bitácora de eventos (`LOGIN_FALLIDO`, `ACCESO_DENEGADO`, `ROL_CAMBIADO`...) | Backup, restauración, copia previa (reversa), desactivar/cambiar rol |

## Continuidad

- **RPO (máxima pérdida de datos aceptable):** 24 horas → backup diario.
- **RTO (tiempo máximo para volver a operar):** 30 minutos → detener, `npm run restore`, arrancar.
- **Plan de reversa:** si la restauración sale mal, se usa `data/securedesk.db.antes-de-restaurar`.

## Riesgos pendientes

- No hay HTTPS en local (en producción iría detrás de un proxy con certificado).
- Los backups quedan en el mismo equipo; faltaría copiarlos a otro lugar.
- No hay revocación de tokens antes de que venzan (se mitiga con expiración de 1 h y validación del usuario en cada petición).
