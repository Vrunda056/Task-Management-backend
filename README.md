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
the frontend origins `http://localhost:3000` and `http://localhost:3002` by
default. Set `PORT` or `FRONTEND_URL` in `.env` to change these defaults.

## Database

The Prisma schema and migration files define the application models. Apply any
pending migrations before starting the API:

```powershell
npm run prisma:migrate
npm run prisma:studio
```

Prisma Client is generated automatically before development startup and build.

## Authentication learning flow

`POST /api/auth/register` creates a new user from `name`, `email`, `position`,
and a password of at least 12 characters. It stores an Argon2id password hash
and returns profile fields without the hash. Duplicate emails are rejected.
Registration does not yet log the user in or issue a token/session.

`POST /api/auth/login` accepts an email and password. On success it returns a
15-minute bearer JWT and the profile, and sets a 7-day refresh token in an
HttpOnly cookie. Invalid credentials return the same generic error. Use
`POST /api/auth/refresh` to rotate the refresh cookie and receive a new access
token; use `POST /api/auth/logout` to revoke the session and clear the cookie.
Set `JWT_SECRET` in `.env` to at least 32 random bytes. Generate a value with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Keep the generated value private and do not commit it. Tokens are signed, not
encrypted. The frontend keeps the access token in memory, restores sessions
from the refresh cookie on page load, and retries a protected request once
after refreshing an expired access token. Logout revokes the refresh session
and clears the cookie. The global guard requires a valid token for all routes
except registration, login, refresh, and logout. Authorization by user
ownership/roles is a later layer.
