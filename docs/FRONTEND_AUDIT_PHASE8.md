# Auditoría frontend de Fase 8 y plan de Fase 9

Fecha: 2026-10-22
Modo: **audit** (sin cambios de código, dependencias ni lockfiles)
Alcance: todas las rutas del App Router, dependencias compartidas del cliente y
validación en vivo con Next.js MCP + Playwright.

## 1. Evidencia y método

- Captura: `npx next analyze --output --snapshot audit-before-1`.
- Export: `analyze-before-1.jsonl` (UTF-16LE), convertido a
  `analyze-before-1.utf8.jsonl` (3.071.401 caracteres) y comprimido en
  `analyze-before-1.jsonl.gz` (214.792 bytes).
- Resumen agregado: `bundle-audit-before-1.json`.
- 10 rutas, 1.224 módulos, 1.561 outputs, 6.601 parts y 133 grupos.
- Next.js MCP (`POST /_next/mcp`): `get_project_metadata`, `get_routes`,
  `get_page_metadata`, `get_errors` y `get_compilation_issues`.
- Playwright: login de contribuyente y administrador, dashboard, `/accountant`,
  consola y viewport móvil de 390×844.

Los tamaños de `next analyze` son **bytes atribuidos** por el analizador. No son
transferencia real, no prueban una petición del navegador y no garantizan un
ahorro. La validación en vivo se usó para confirmar comportamiento, no para
medir producción.

## 2. Línea base del bundle

| Ruta | Total atribuido (comprimido) | Código/CSS propio | Chunks cliente |
|---|---:|---:|---:|
| `/declarations/new` | 197,2 KB | 24,9 KB | 8 |
| `/declarations/[id]` | 196,1 KB | 23,8 KB | 8 |
| `/declarations/[id]/processing` | 194,8 KB | 22,5 KB | 8 |
| `/accountant` | 194,1 KB | 21,8 KB | 8 |
| `/dashboard` | 189,2 KB | 16,9 KB | 8 |
| `/register` | 188,3 KB | 16,0 KB | 8 |
| `/login` | 187,5 KB | 15,2 KB | 8 |
| `/` | 180,6 KB | 12,1 KB | 8 |
| `/_not-found` | 180,3 KB | 11,8 KB | 7 |

- **Bootstrap compartido:** 160,6 KB comprimidos por ruta (5 chunks). Es el
  costo de React/Next y no se elimina con un `import()`.
- **Carga dependiente del render:** 20–36,6 KB por ruta (3 chunks). Incluye
  8,8 KB de `globals.css` y entre 3,3 y 16,1 KB de JavaScript propio.
- **Conclusión:** el proyecto propio ya está pequeño. El mayor costo es el
  runtime compartido; fragmentar más las rutas tendría poco retorno y añadiría
  estados de carga.

## 3. Hallazgos

### 3.1 Fuente monoespaciada sin uso

`src/app/layout.tsx` carga `Geist_Mono` y la aplica al `<html>`, pero
`--font-geist-mono` no se usa en CSS ni TSX. El HTML de producción precarga:

- `797e433ab948586e-s.p.0r6juujl39pe6.woff2` (Geist Mono): **23.108 bytes**.
- `caa3a2e1cccd8315-s.p.0wgildi0cnwt9.woff2` (Geist Sans): 29.288 bytes.

Además, el CSS compartido contiene 1.643 bytes de bloques `@font-face` de Geist
Mono. Eliminar la fuente y su variable ahorra la descarga/precarga de 23,1 KB y
simplifica el CSS. Es un cambio de bajo riesgo, pero requiere actualizar el
layout y verificar que ningún estilo dependa de la variable.

### 3.2 CSS muerto

`src/app/page.module.css` (1.942 bytes) no se importa en ninguna ruta. No entra
al bundle, pero es deuda de mantenimiento. Eliminarlo no cambia el rendimiento.

### 3.3 Sin boundaries propios

`get_page_metadata` muestra solo `global-error.js` y `not-found.js` integrados
de Next. No existen `app/error.tsx`, `app/not-found.tsx` ni `app/loading.tsx`
propios. Un fallo de render o una ruta inexistente cae en la UI genérica de
Next, en inglés y sin marca. Añadir boundaries permite recuperación, mensajes
en español y navegación consistente.

### 3.4 Sesión y WebSocket

- Los tokens viven en `sessionStorage` (`src/lib/auth.tsx`). Es vulnerable a
  XSS; la auditoría de seguridad ya lo marca como bloqueo de producción.
- `src/hooks/useJobSocket.ts` envía el JWT en la query
  (`?token=<JWT>`). Aunque el backend valida dueño y cierre 4401/4403, el token
  puede quedar en logs del proxy o herramientas de observabilidad.
- El plan P0 es migrar a cookies `httpOnly`, `Secure`, `SameSite` con un BFF en
  Next.js y cambiar el WebSocket a ticket corto de un solo uso o subprotocolo.

### 3.5 Invitaciones sin interfaz

El backend ya expone el flujo con aceptación explícita, pero el frontend no
tiene tipos, llamadas ni pantallas. `/accountant` muestra firma, miembros,
clientes y declaraciones; no hay crear/listar/revocar invitaciones. Un usuario
invitado tampoco tiene una ruta para ver, aceptar o rechazar. Esto deja la Fase
8 incompleta de extremo a extremo.

### 3.6 Accesibilidad y experiencia

- El listado del dashboard se actualiza sin región `aria-live`; los estados de
  carga usan `role="status"`, pero la tabla no anuncia cambios.
- Los esqueletos con `animate-pulse` no respetan `prefers-reduced-motion`.
- El título y la descripción son genéricos (`Taxfrom value`), no describen la
  tarea.
- En móvil, `/accountant` no tiene overflow horizontal: `scrollWidth=375`,
  `innerWidth=390`. La base responsive es correcta.

### 3.7 Validación en vivo

- Login de contribuyente y administrador: OK.
- Dashboard y `/accountant`: sin errores de consola.
- Next.js MCP: `configErrors=[]`, `sessionErrors=[]`, `issues=[]`.
- `get_page_metadata`: sesiones `/dashboard` y `/login` con boundaries builtin.
- `get_request_insights`: no disponible; requiere
  `experimental.requestInsights = true` y reiniciar el dev server.

## 4. Plan priorizado de Fase 9

### P0 — bloqueos de producción

| Mejora | Evidencia | Criterio de cierre |
|---|---|---|
| Cookies `httpOnly` + BFF + CSRF | Tokens en `sessionStorage`; auditoría de seguridad | Login/refresh/logout sin tokens accesibles a JS; pruebas de CSRF y expiración |
| UI completa de invitaciones | Endpoints backend sin consumo; `/accountant` sin sección | Crear/listar/revocar; preview/aceptar/rechazar; token mostrado una vez; E2E de email incorrecto y 409 |

### P1 — seguridad, resiliencia y calidad

| Mejora | Evidencia | Criterio de cierre |
|---|---|---|
| WebSocket sin JWT en query | `useJobSocket.ts` | Ticket corto o subprotocolo; sin token en URL ni logs |
| Boundaries y rutas de error | MCP solo muestra builtin | `error.tsx`, `not-found.tsx`, `loading.tsx` en español; prueba de fallo |
| E2E automatizados | Validación manual | Playwright en CI: login, refresh/401, roles, wizard, progreso, PDF, invitaciones, móvil |
| Quitar `Geist_Mono` y CSS muerto | 23.108 bytes + 1.643 bytes CSS; 1.942 bytes sin importar | Snapshot after sin la fuente; build/lint/typecheck verdes |
| Accesibilidad | Tabla sin `aria-live`; animaciones sin reduce | `aria-live` en listados, `motion-reduce`, foco y contraste revisados |
| Carga de cartera | 4 llamadas paralelas + N declaraciones por cliente | Carga diferida al expandir; límites visibles; sin ráfagas |

### P2 — mejoras posteriores

- Metadatos por ruta y títulos descriptivos.
- Analítica de producto y métricas de embudo.
- Componentes de servidor donde no se necesite estado de cliente.
- PWA/offline y notificaciones, solo después de cerrar P0/P1.

## 5. Lo que no se recomienda

- **No** hacer `dynamic import()` de pasos del wizard o tablas de resultados con
  la evidencia actual: los ahorros atribuidos son de 1,4–2,7 KB por componente y
  añaden waterfalls, placeholders y riesgo de regresión.
- **No** dividir `api.ts` o `auth.tsx` por feature: son compartidos por todas las
  rutas y suman 2,9 KB de código propio por ruta.
- **No** optimizar `globals.css` a ciegas: son 8,8 KB comprimidos y sostienen toda
  la UI; primero hay que medir cobertura real de clases.

La siguiente captura (`audit-after-1`) debe comparar el mismo alcance y métrica
después de aplicar el cambio de fuente y los boundaries. Cualquier ahorro de
red real se mide con el proxy de producción, no con `next analyze`.

## 6. Ejecución Fase 9 P0 — UI de invitaciones (2026-10-22)

Estado: **entregada en código y validada localmente; el P0 de sesión/BFF sigue
pendiente**. La aceptación real no se ejecutó en vivo para no alterar la firma
demo.

### Entregado
- Tipos y cliente API para crear/listar/revocar invitaciones, listar las propias,
  previsualizar, aceptar y rechazar.
- `/accountant/invitations`: creación con email y rol, token mostrado una sola
  vez, copia del enlace, confirmación para crear otra invitación, listado con
  filtro por estado, paginación y revocación en dos pasos. Solo admin.
- `/invitations/[token]`: preview, aceptación con checkbox explícito, rechazo en
  dos pasos, aviso si la cuenta ya pertenece a una firma y estados `404`, `409`,
  `410` y `422`.
- Login con `next` interno y validado (`safeInternalPath`), para volver a la
  invitación después de autenticarse.
- Aviso de invitaciones pendientes en `/dashboard` sin token, porque el listado
  no lo devuelve; la acción se hace desde el enlace recibido.
- Acción **Gestionar invitaciones** en `/accountant` para administradores.

### Validación local
- Crear, copiar y revocar una invitación; al revocar la misma invitación se
  limpia la tarjeta con el token y vuelve el formulario de creación.
- Email incorrecto: un admin que abre un enlace ajeno recibe `404` y la opción
  de cerrar sesión y usar otra cuenta.
- Flujo `login` con `next`: sin sesión se muestra el prompt de login; al
  autenticarse se vuelve al preview de la invitación. Un `next` externo
  (`https://evil.example/...`) se descarta y redirige a `/dashboard`.
- Rechazo real con `invitado.ui.20261022@example.com`: pantalla de éxito, el
  aviso de pendientes desaparece del dashboard y reabrir el enlace devuelve
  `409`.
- El checkbox habilita **Aceptar invitación** sin ejecutar la aceptación.
- Filtro **Pendientes** sin resultados después de revocar la última invitación.
- Viewport `390×844`: gestión, preview y estado `409` con
  `innerWidth=390` y `scrollWidth=390` (sin overflow horizontal).
- Next MCP: `get_errors` sin errores de configuración/sesión y
  `get_compilation_issues` vacío antes de detener el dev server.

### Verificación de build
```powershell
npx next typegen
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

Los cuatro comandos pasan. El build de producción incluye
`/accountant/invitations` y `/invitations/[token]`; las rutas dinámicas quedan
como *Partial Prerender*.

### Límites y siguiente paso
- La aceptación real de la UI no se probó en vivo para no convertir la cuenta de
  prueba en cliente de la firma demo. La cubren las pruebas backend de
  aceptación, bloqueo de transferencia y auditoría.
- Datos de prueba: `invitado.ui.20261022@example.com` quedó registrado y sin
  firma; sus invitaciones de prueba quedaron rechazadas o revocadas. No se
  agregaron clientes a la firma demo.
- El P0 de sesión sigue abierto: cookies `httpOnly` + BFF + CSRF, sin tokens en
  `sessionStorage`. Después siguen el WebSocket sin JWT en query y los E2E
  automatizados.
