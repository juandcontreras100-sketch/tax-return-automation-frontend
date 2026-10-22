# Taxfrom value — Frontend Fase 7

Aplicación Next.js 16 (App Router, React 19, Tailwind 4) conectada a la API FastAPI del proyecto.

## Requisitos

- Node.js 20+
- Backend en `http://127.0.0.1:8080`
- Variables en `.env.local` (copia `.env.local.example`)

```dotenv
NEXT_PUBLIC_API_URL=http://127.0.0.1:8080/api
NEXT_PUBLIC_WS_URL=ws://127.0.0.1:8080/api/v1/ws
```

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

## Sesión

Los tokens se guardan en `sessionStorage` y se validan con `GET /auth/me` al hidratar. El refresh se hace una sola vez por petición (single-flight). Para producción se recomienda migrar a cookies `httpOnly` con un BFF, porque `sessionStorage` es vulnerable a XSS.

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

## Contenedor

El `Dockerfile` usa salida `standalone` y requiere que las URLs públicas se
inyecten en tiempo de build:

```powershell
docker build -t tax-return-frontend:latest `
  --build-arg NEXT_PUBLIC_API_URL=https://api.example.com/api `
  --build-arg NEXT_PUBLIC_WS_URL=wss://api.example.com/api/v1/ws .
docker run --rm -p 3001:3001 tax-return-frontend:latest
```

El stack completo y los secretos se documentan en
`../tax-return-backend/docs/DEPLOYMENT.md`.

## Notas

- El PDF se descarga con `fetch` + `Authorization`; un `<a href>` directo devuelve 401.
- El WebSocket real es `/api/v1/ws/jobs/{job_id}?token=<JWT>`. El backend valida el token y que el trabajo pertenezca al usuario; sin token responde cierre 4401 y con otro dueño 4403.
- Los errores 422 de FastAPI se normalizan a texto legible en `src/lib/api.ts`.
- El Formulario 210 se presenta en el portal DIAN con IFE; el adaptador `.pfx`/XAdES del backend no es un canal oficial del F210. Ver `../tax-return-backend/docs/DIAN_F210_VALIDACION.md`.
