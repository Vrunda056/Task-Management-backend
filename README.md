# Task backend

NestJS API using Prisma ORM 7 and PostgreSQL.

## Setup

Copy `.env.example` to `.env`, set `DATABASE_URL` to your local PostgreSQL
connection, then run:

```powershell
npm install
npm run start:dev
```

Nest listens on port 3001 by default, serves endpoints under `/api`, and allows
the frontend origin `http://localhost:3000`. Set `PORT` or `FRONTEND_URL` in
`.env` to change these defaults.

No application routes or Prisma models are included yet. Add models before
creating the first migration:

```powershell
npm run prisma:migrate -- --name init
npm run prisma:studio
```

Prisma Client is generated automatically before development startup and build.
