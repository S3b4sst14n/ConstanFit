# ConstanFit — Backend

API Express + Prisma + PostgreSQL.

## Requisitos

- Node.js 20+
- Docker Desktop (para levantar Postgres) **o** un Postgres local

## Setup (primera vez)

```powershell
# 1. Instalar dependencias
cd Back
npm install

# 2. Copiar variables de entorno
copy .env.example .env

# 3. Levantar Postgres (con Docker)
docker compose up -d

# 4. Crear tablas y datos iniciales
npm run prisma:migrate -- --name init
npm run db:seed
```

El seed crea los 3 planes (Diario, Mensual, Quincenal) y un usuario admin:

- **username:** `admin`
- **password:** `admin123`

## Día a día

```powershell
npm run dev          # arranca el servidor con --watch en http://localhost:4000
npm run prisma:studio # GUI para ver/editar la base de datos
```

## Endpoints

| Método | Ruta                | Auth     | Descripción                        |
| ------ | ------------------- | -------- | ---------------------------------- |
| GET    | `/api/health`       | —        | Healthcheck                        |
| POST   | `/api/auth/register`| —        | Crea usuario (rol CLIENT por def.) |
| POST   | `/api/auth/login`   | —        | Devuelve `{ user, token }`         |
| GET    | `/api/auth/me`      | Bearer   | Usuario actual                     |
| GET    | `/api/plans`        | —        | Lista los 3 planes                 |
| GET    | `/api/plans/:id`    | —        | Detalle de un plan                 |
| PUT    | `/api/plans`        | ADMIN    | Crea/actualiza un plan por `type`  |

## Estructura

```
src/
├── server.js          # entrypoint (listen + shutdown)
├── app.js             # express + middleware + rutas
├── config/env.js      # carga y valida .env
├── lib/               # prisma singleton, asyncHandler, HttpError
├── middleware/        # auth JWT, manejo de errores
├── controllers/       # parseo Zod + llamada a service/prisma
├── services/          # lógica que no es CRUD trivial (auth)
└── routes/            # mapeo url → controller
```

Patrón: controllers parsean con Zod y delegan. CRUD simple va directo a Prisma desde el controller; lógica con reglas (hash de passwords, JWT) vive en `services/`.
