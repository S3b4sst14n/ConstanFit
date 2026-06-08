# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

A split-stack project living in **one git repo**, but the two stacks are **not** symmetric folders:

- **Repo root** — the React 19 + Vite SPA (`src/`, `package.json`, `vite.config.js`, `index.html`, `public/`, `eslint.config.js`). This is the frontend; there is no `Front/` folder.
- [Back/](Back/) — Node 20 + Express + Prisma API, backed by **Turso (libSQL)**.

They are independent npm projects: the frontend runs from the repo root, the backend from inside [Back/](Back/). This shape is intentional — it lets Vercel build the SPA from the root while Railway builds the API with Root Directory = `Back` (see [Deployment](#deployment)).

## Commands

### Frontend (repo root)

- `npm run dev` — Vite dev server (defaults to `http://localhost:5173`).
- `npm run build` — production build to `dist/`.
- `npm run preview` — serve the production build.
- `npm run lint` — ESLint (flat config at [eslint.config.js](eslint.config.js)). No `lint:fix` script — use `npx eslint . --fix`.

### Backend ([Back/](Back/))

- `npm run dev` — Express server with `node --watch` on `http://localhost:4000`.
- `npm start` — run the server without watch.
- `npm run db:seed` — run [Back/prisma/seed.js](Back/prisma/seed.js) (seeds 3 roles, the `admin` user `admin`/`admin123`, 3 plans, demo clients with subscriptions/payments/attendance, and demo store products so the dashboard/tienda have data). Idempotent.
- `npm run db:tienda` — run [Back/prisma/migrate-tienda.js](Back/prisma/migrate-tienda.js): creates the `productos`/`ventas` tables on the live Turso DB (idempotent, `CREATE TABLE IF NOT EXISTS`). Needed once on any DB predating the store feature, since there is no `prisma migrate`.
- `npm run prisma:generate` — regenerate the Prisma client after editing the schema. Also runs automatically via `postinstall`.
- `npm run db:pull` — introspect the live DB back into [Back/prisma/schema.prisma](Back/prisma/schema.prisma).
- `npm run prisma:studio` — Prisma Studio GUI.

There is **no migration workflow** (`prisma migrate` is not wired up). The schema is applied to Turso by running [Back/prisma/init-turso.sql](Back/prisma/init-turso.sql) against the database; `schema.prisma` is then kept in sync via `db:pull`. If you change the data model, update **both** `init-turso.sql` and `schema.prisma`, and to apply the change to an already-deployed DB write an idempotent apply script as in [Back/prisma/migrate-tienda.js](Back/prisma/migrate-tienda.js) (the pattern used for the `productos`/`ventas` tables) and run it against each environment's Turso.

There is no test runner configured on either side. Do not invent one or claim tests exist.

### Database setup

Runtime uses **Turso/libSQL**, not Postgres. Copy `Back/.env.example` to `Back/.env` and fill in `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` (and a long random `JWT_SECRET`). `TURSO_DATABASE_URL` may also point at a local file (`file:./...`) for offline dev. `DATABASE_URL` in the env is used **only** by the Prisma CLI; the running server ignores it and connects through the libSQL driver adapter in [Back/src/lib/prisma.js](Back/src/lib/prisma.js).

[Back/prisma.config.ts](Back/prisma.config.ts) is what makes the Prisma CLI behave: its mere presence stops Prisma from auto-loading `.env` (hence the explicit `import "dotenv/config"`) and from reading the `prisma` key of `package.json` (hence `migrations.seed` lives there). Crucially, `studio.adapter` wires **Prisma Studio** through the same libSQL adapter as the runtime, so Studio shows the real Turso data instead of trying to open the non-existent local SQLite file from `DATABASE_URL`.

Note: [Back/docker-compose.yml](Back/docker-compose.yml) still defines a Postgres 16 service, but it is **legacy and unused** — the app no longer talks to Postgres at runtime. Don't rely on it.

## Architecture

### Backend

Express app composed in [Back/src/app.js](Back/src/app.js) (`createApp()`), listened on by [Back/src/server.js](Back/src/server.js) (which also handles graceful shutdown). All routes mount under `/api` ([Back/src/routes/index.js](Back/src/routes/index.js)): `health`, `auth`, `dashboard`, `plans`, `clientes`, `suscripciones`, `pagos`, `asistencias`, `productos`, `ventas`, `usuarios`. `usuarios` is the only resource guarded **ADMIN-only** (`requireRole("ADMIN")`); the rest use ADMIN+STAFF.

Layering convention — keep it:

- **routes/** — only wire URLs to controllers and apply middleware. The standard guard for staff-only resources is `const staff = [requireAuth, requireRole("ADMIN", "STAFF")]` spread into each route; every controller method is wrapped in `asyncHandler`.
- **controllers/** — parse input with Zod, then call Prisma. Most CRUD controllers are **generated** by the `crudController` factory (see below) and only define a Zod schema; hand-write a controller (or override one method) only when there's extra logic — e.g. [plans.controller.js](Back/src/controllers/plans.controller.js) (public list with `?all=1`), [suscripciones.controller.js](Back/src/controllers/suscripciones.controller.js) (custom `create` that derives `endDate` from the plan), [dashboard.controller.js](Back/src/controllers/dashboard.controller.js) (aggregation only).
- **services/** — non-trivial business logic. Currently [auth.service.js](Back/src/services/auth.service.js) (bcrypt hashing, JWT signing, `register`/`login`/`me`).
- **lib/** — cross-cutting helpers: `prisma.js` (singleton libSQL-adapter client, reused on hot reload), `crud.js` (the CRUD factory), `httpError.js` (`HttpError`), `asyncHandler.js`.
- **config/** — `env.js` validates required env vars at boot (throws if `TURSO_DATABASE_URL` or `JWT_SECRET` is missing) and exports a typed `env` object.
- **middleware/** — `auth.js` (`requireAuth` reads `Authorization: Bearer <jwt>` and sets `req.user`; `requireRole(...roles)`), `error.js`.

**The CRUD factory.** [Back/src/lib/crud.js](Back/src/lib/crud.js) — `crudController(modelName, { schema, label, include, orderBy, softDelete })` returns `{ list, get, create, update, remove, findOr404 }` for a Prisma model. It enforces **soft delete by default**: `list`/`get` filter `deletedAt: null`, and `remove` sets `deletedAt` instead of deleting the row. `update` validates with `schema.partial()`. The `clientes`, `pagos`, `asistencias`, and `productos` controllers are thin wrappers around this; reach for it before hand-writing CRUD. [ventas.controller.js](Back/src/controllers/ventas.controller.js) reuses the factory's `list`/`get` but hand-writes `create`/`remove` inside a `prisma.$transaction` so a sale decrements `Producto.stock` (and voiding a sale restores it) atomically — the only place interactive transactions are used.

**Errors.** Throw `HttpError(status, message)` from anywhere in a request — never `res.status().json()` an error from a service. [error.js](Back/src/middleware/error.js) translates `ZodError` → 400, `HttpError` → its status, Prisma `P2002` (unique violation) → 409, and anything else → 500. `notFound` handles unmatched routes.

**Data model** ([schema.prisma](Back/prisma/schema.prisma)) — note models and columns are in **Spanish** and tables are `@@map`'d to snake_case plurals. Models: `Role`, `Usuario`, `Plan`, `Cliente`, `Suscripcion`, `Pago`, `Asistencia`, `Producto`, `Venta`. Every model has `createdAt`/`updatedAt`/`deletedAt` (soft delete). Roles are a **table** (`Role`), not an enum — the seed creates `ADMIN`, `STAFF`, `CLIENT`. There is **no** `PlanType` enum; a `Plan` is `{ nombre, precio, duracionDias, descripcion, activo }`. The store (tienda): a `Producto` is `{ nombre, categoria, precio, stock, descripcion, activo }` where `categoria` is a Zod-validated string slug (`ropa | snacks | preentreno | agua | otro`, no DB enum); a `Venta` is `{ productId, cantidad, precioUnitario, total, metodoPago, fecha }` with `precioUnitario` a snapshot of the price at sale time. Relations: `Cliente` → many `Suscripcion`/`Pago`/`Asistencia`; `Suscripcion` → `Plan` + `Cliente` + many `Pago`; `Producto` → many `Venta`.

**Auth.** JWT payload carries `{ sub: userId, role, username }` where `role` is the `Role.nombre` string; `requireAuth` hangs `req.user = { id, role, username }`. New registrations default to the `CLIENT` role. Roles for `requireRole` are the strings `ADMIN | STAFF | CLIENT`.

### Frontend

Single-page app driven by `react-router-dom` v7. The route tree is centralized in [src/App.jsx](src/App.jsx) and uses **two layout routes**:

- `<PublicLayout/>` ([layouts/PublicLayout.jsx](src/Components/layouts/PublicLayout.jsx)) wraps `/`, `/Planes`, `/Acerca`, `/Login` — renders `<Navbar/>`, the page inside a `.overlay` div, `<Footer/>`, and a floating `<WhatsAppButton/>`.
- `<DashboardLayout/>` ([layouts/DashboardLayout/](src/Components/layouts/DashboardLayout/)) wraps the admin panel (`/Dashboard` index + `/Dashboard/Asistencias` + `/Dashboard/Ingresos` + `/Dashboard/Usuarios`) — a collapsible sidebar (links grouped into "Administración" / "Sitio" sections), no top nav. It's gated by `<RequireRole roles={['ADMIN','STAFF']}>` ([routing/RequireRole.jsx](src/Components/routing/RequireRole.jsx)), which renders nothing while auth is resolving, redirects to `/Login` when logged out, and to `/` when the role isn't allowed. `/Dashboard/Usuarios` is **further** wrapped in `<RequireRole roles={['ADMIN']}>` (STAFF can't reach it), and its sidebar link is hidden for non-admins via an `adminOnly` flag on the nav item.

Network + auth state live in thin layers:

- [src/lib/api.js](src/lib/api.js) — a `fetch` wrapper reading `VITE_API_URL` (default `http://localhost:4000/api`), managing a JWT in `localStorage` under `constanfit_token` via `tokenStorage`, throwing `ApiError` on non-2xx. Calls that need auth pass `{ auth: true }` to attach the Bearer token. Exposes `api.auth.*`, `api.plans.*`, `api.dashboard.*`, `api.clientes.*`, `api.suscripciones.*`, `api.asistencias.*`, `api.productos.*`, `api.ventas.*`, `api.usuarios.*`.
- Auth context is **split across two files** to satisfy the react-refresh lint rule (a file exporting a component shouldn't also export non-components): [context/auth-context.js](src/context/auth-context.js) holds the `AuthContext` object + the `useAuth()` hook, while [context/AuthContext.jsx](src/context/AuthContext.jsx) holds the `<AuthProvider>` component (wrapped around the app in [main.jsx](src/main.jsx)). On boot it calls `/auth/me` if a token exists. Keep this split when touching context.

Pages that read from the API should degrade gracefully when the backend is down — see `FALLBACK_PLANS` in [src/Components/Planes/PlanSection.jsx](src/Components/Planes/PlanSection.jsx): render hardcoded data first, replace from API in `useEffect`.

Component organization under [src/Components/](src/Components/):

- `Home/` (landing, composes `Hero/`) and `Hero/` (split into `HeroContent`, `HeroImage`, `CTAButton`, `Benefit`, `SocialIcons`).
- `Pages/` — route-level screens (`Planes`, `Acerca`, `Login`, `Dashboard`, `Asistencias`, `Ingresos`, `Usuarios`), siblings of `Home/`.
- `Planes/` — reusable plan UI (`PlanCard`, `PlanSection`, `PlanIcons`).
- `layouts/` — `PublicLayout`, `DashboardLayout/`, `Navbar/`, `Footer/`.
- `routing/` — `RequireRole`. `WhatsAppButton/` — floating contact button.

**Styling.** There IS a design-token system now: [src/styles/tokens.css](src/styles/tokens.css) is the single source of truth for typography, color (graphite neutrals + gold brand), spacing, radii, elevation, and easing as CSS custom properties — imported in [main.jsx](src/main.jsx) **before** `index.css`. Use these `--*` variables in new styles rather than hardcoding values. Still **no CSS-in-JS, no CSS modules, no Tailwind** — each component folder owns a colocated `.css` file imported by its `.jsx`. Global background/visual layering lives in `index.css`.

Icons come from two libraries used side by side: `@fortawesome/react-fontawesome` (free-solid + free-brands) and `lucide-react`. Pick whichever the surrounding file already uses rather than introducing a third.

## Deployment

Single repo, two deploy targets:

- **Frontend → Vercel**, built from the **repo root**. [vercel.json](vercel.json) rewrites every path to `/index.html` so client-side routes (e.g. `/Planes`, `/Dashboard`) survive a hard refresh / deep link. Set `VITE_API_URL` in the Vercel project env to the deployed API's `/api` URL.
- **Backend → Railway**, with **Root Directory = `Back`**. Set `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET`, and `CORS_ORIGIN` (the deployed frontend origin) in the Railway service.

## Conventions worth preserving

- JSX files use `.jsx` and PascalCase folder + filename matching the default export.
- Routes are declared with **PascalCase paths** (`/Planes`, `/Acerca`, `/Login`, `/Dashboard`) — match that style when adding routes, otherwise links silently 404.
- React 19 is in use; no `forwardRef`/legacy ref patterns needed in new components.
- Backend identifiers (models, fields, controller variables, user-facing messages) are in **Spanish** — follow that when extending the API.
