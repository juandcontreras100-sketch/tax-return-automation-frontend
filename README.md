# Taxfrom value — Frontend Fase 7/8/9

Aplicación Next.js 16 (App Router, React 19, Tailwind 4) conectada a la API FastAPI del proyecto.

## Requisitos

- Node.js 20+
- Backend en `http://127.0.0.1:8080`
- Variables en `.env.local` (copia `.env.local.example`)

```dotenv
API_INTERNAL_URL=http://127.0.0.1:8080/api
NEXT_PUBLIC_WS_URL=ws://127.0.0.1:8080/api/v1/ws
```

`API_INTERNAL_URL` es **solo del servidor**: el navegador nunca llama al
backend directamente. `NEXT_PUBLIC_WS_URL` sí llega al cliente porque el
WebSocket se abre contra FastAPI con un ticket efímero.

## Desarrollo

```powershell
npm ci
npm run dev
```

Abre `http://localhost:3001`.

## Verificación

```powershell
npx next typegen
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

`npm run dev` y `npm run start` usan el puerto **3001**. El frontend no debe ejecutar `next build` mientras el servidor de desarrollo está escribiendo `.next`; detén el dev server o usa otro directorio de build.

## Rutas

| Ruta | Uso |
|---|---|
| `/` | Redirección según sesión |
| `/login`, `/register` | Autenticación real contra `/api/v1/auth` |
| `/dashboard` | Declaraciones del usuario, filtros y paginación |
| `/declarations/new` | Wizard de carga multipart |
| `/declarations/[id]/processing` | Progreso WebSocket y polling de respaldo |
| `/declarations/[id]` | Resultados, casillas y PDF autenticado |
| `/accountant` | Cartera del contador/admin |
| `/accountant/invitations` | Crear, listar y revocar invitaciones de la firma (solo admin) |
| `/invitations/[token]` | Vista previa y aceptación/rechazo de una invitación |

## Auditoría de Fase 8

La auditoría de bundle, Next.js MCP y Playwright está en
[`docs/FRONTEND_AUDIT_PHASE8.md`](docs/FRONTEND_AUDIT_PHASE8.md). Resume la
línea base (`audit-before-1`), los hallazgos y el plan P0/P1/P2 de Fase 9.

Conclusión corta: el bootstrap compartido es de 160,6 KB comprimidos por ruta y
el código propio es de 12,1–24,9 KB; no conviene fragmentar más las rutas. Las
mejoras de mayor retorno son seguridad de sesión, boundaries, E2E y eliminar la
fuente `Geist_Mono` sin uso (23.108 bytes + 1.643 bytes de CSS). La UI de
invitaciones ya está entregada.

## Sesión y BFF

El navegador solo conoce dos cookies:

- `taxfrom_session`: identificador opaco de sesión, `HttpOnly`, `SameSite=Lax`
  y `Secure` cuando la petición llega por HTTPS.
- `taxfrom_csrf`: token legible por JavaScript para el patrón double-submit.

Detrás de un proxy TLS, el proxy debe enviar `X-Forwarded-Proto: https`; el BFF
usa ese header para marcar las cookies como `Secure`.

Los access/refresh tokens de FastAPI viven en un store del servidor Next.js y
nunca se envían al navegador. El cliente llama a `/api/v1/*`; el BFF añade el
`Authorization`, renueva la sesión una sola vez por sesión cuando el backend
responde `401` y reintenta la petición. Las mutaciones exigen mismo origen y el
header `X-CSRF-Token`; login y registro solo exigen mismo origen.

Rutas del BFF:

| Ruta | Uso |
|---|---|
| `POST /api/v1/auth/login` | Valida credenciales, crea la sesión y devuelve el `User` |
| `POST /api/v1/auth/register` | Proxy público de registro |
| `POST /api/v1/auth/logout` | Revoca best-effort y borra las cookies |
| `/api/v1/*` | Proxy autenticado, con refresh y CSRF |

El store es un `Map` en memoria del proceso. Sirve para desarrollo y para una
sola instancia; al reiniciar Next se pierden las sesiones. Para producción se
necesita Redis o un store compartido, además de TLS y cookies `Secure`. No se
debe ejecutar más de una réplica con este store en memoria.

El login acepta un parámetro `next` validado como ruta interna. Se usa para
volver a una invitación después de autenticarse sin permitir redirecciones
abiertas; un `next` externo se descarta y cae en `/dashboard`.

## Demo local

Credenciales solo para desarrollo, creadas por los scripts de seed:

- Contribuyente: `demo.phase7@gmail.com` / `Demo1234`
- Administrador de firma: `contador.phase7@gmail.com` / `Contador1234`
- Contador: `revisor.phase7@gmail.com` / `Revisor1234`

No usar estas credenciales ni datos demo en producción.

## Contador y correcciones

- El contador ve solo clientes con `accountant_id === user.id`; el administrador ve todos los clientes y puede asignar o desasignar contadores.
- El administrador no ve automáticamente las declaraciones de los clientes: RLS exige que un contador esté asignado. La interfaz lo explica.
- La cartera carga hasta 100 clientes y consulta declaraciones de los primeros 30; si hay más, se muestra un aviso.
- Las correcciones usan `PATCH /declarations/{id}/values/{field_code}`. Un valor sin documento de origen se guarda con `document_id: null` y conserva la auditoría.
- **Invitaciones:** la UI está documentada en la sección siguiente. El endpoint heredado `POST /firms/me/members` sigue bloqueado con `501`.

## Invitaciones

- Solo el administrador ve el acceso **Gestionar invitaciones** en `/accountant`; `/accountant/invitations` revalida el rol y redirige a cualquier usuario que no sea admin.
- La gestión permite crear, listar, filtrar por estado, paginar y revocar con confirmación en dos pasos. El token se muestra una sola vez al crear la invitación y no se puede recuperar desde el listado.
- `/invitations/[token]` exige una sesión con el correo invitado. La aceptación requiere marcar un checkbox explícito; el rechazo pide confirmación en dos pasos.
- Estados cubiertos: `404` si el correo autenticado no coincide, `409` si la invitación ya no está pendiente, `410` si expiró y `422` si el token no es válido.
- El dashboard muestra un aviso informativo de invitaciones pendientes, sin token. La acción se realiza desde el enlace que compartió el administrador.
- Validación local: crear/copiar/revocar, email incorrecto `404`, preview, rechazo, reapertura `409`, filtro de pendientes vacío y viewport `390×844` sin overflow en la gestión, el preview y el estado `409`.
- La aceptación real no se ejecutó en vivo para no convertir la cuenta de prueba en cliente de la firma demo; el backend la cubre con pruebas de aceptación y auditoría. La cuenta `invitado.ui.20261022@example.com` quedó registrada y sin firma; sus invitaciones de prueba quedaron rechazadas o revocadas.

## Contenedor

El `Dockerfile` usa salida `standalone`. `NEXT_PUBLIC_WS_URL` se inyecta en
tiempo de build porque lo usa el cliente; `API_INTERNAL_URL` se configura en
runtime:

```powershell
docker build -t tax-return-frontend:latest `
  --build-arg NEXT_PUBLIC_WS_URL=wss://api.example.com/api/v1/ws .
docker run --rm -p 3001:3001 `
  -e API_INTERNAL_URL=http://<backend-host>:8080/api `
  tax-return-frontend:latest
```

En el compose de producción, `API_INTERNAL_URL` apunta a
`http://backend:8080/api` dentro de la red de Compose.

El stack completo y los secretos se documentan en
`../tax-return-backend/docs/DEPLOYMENT.md`.

## Notas

- El PDF se descarga con `fetch` a través del BFF; el `Authorization` lo añade el servidor.
- El WebSocket real es `/api/v1/ws/jobs/{job_id}`. El cliente pide un ticket de 60 s a `POST /api/v1/ws/jobs/{job_id}/ticket` y lo envía como subprotocolo `taxfrom.job.v1`, no en la URL. El backend valida firma, `job_id`, expiración y dueño; sin ticket válido cierra con 4401 y con otro dueño con 4403.
- Los errores 422 de FastAPI se normalizan a texto legible en `src/lib/api.ts`.
- El Formulario 210 se presenta en el portal DIAN con IFE; el adaptador `.pfx`/XAdES del backend no es un canal oficial del F210. Ver `../tax-return-backend/docs/DIAN_F210_VALIDACION.md`.
