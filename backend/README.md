<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## ForceCodeX — Backend

This folder contains the NestJS backend for the ForceCodeX project. It provides an API and database access (Prisma + Postgres).

### Responsibilities

- Run the NestJS application and expose REST/GraphQL endpoints used by the frontend.
- Manage the database schema and data using Prisma (migrations & seeding).

---

## Prerequisites

- Node.js (recommended >= 18)
- Yarn, npm, or pnpm
- A Postgres database (local or remote)

Environment variables are read from `.env` in this folder. Ensure values for `DATABASE_URL` and any other needed secrets are set.

## Quick start

Install dependencies:

```bash
# using yarn
yarn install

# or npm
npm install
```

Generate Prisma client (if needed):

```bash
npx prisma generate
```

Start development server (watch mode):

```bash
yarn dev
```

Build for production:

```bash
yarn build
yarn start:prod
```

Run tests:

```bash
yarn test
yarn test:e2e
```

## Prisma (DB) tasks

- Create or apply migrations:

```bash
npx prisma migrate dev
```

- Run seed script (project uses `bun` in `package.json` for seeding; if you don't have bun installed, use `node`/`ts-node`):

```bash
# recommended (as configured)
bun prisma/seed.ts

# or (if not using bun)
npx ts-node prisma/seed.ts
# or
node -r ts-node/register prisma/seed.ts
```

- Open Prisma Studio:

```bash
npx prisma studio
```

## Project structure

- `src/` – application source
  - `main.ts` – bootstrap
  - `app.module.ts` – root module
  - `prisma/` – Prisma integration
    - `prisma.module.ts`
    - `prisma.service.ts` (exports `PrismaService` that extends `PrismaClient`)
  - `user/` – example feature module
- `prisma/` – Prisma schema and seed scripts
- `generated/` – generated Prisma client typings (checked into repo)

## Notes & recommendations

- `PrismaService` in `src/prisma/prisma.service.ts` should extend `PrismaClient` so `this.prisma.<model>` (for example `this.prisma.user`) is available with proper typings.
- The repository's `package.json` contains scripts (`dev`, `build`, `start`, `test`, etc.). Use those for consistent behavior.
- If you change the Prisma schema (`prisma/schema.prisma`), run `npx prisma generate` and create/apply migrations with `npx prisma migrate`.

## Useful commands summary

```bash
yarn install        # install deps
yarn dev            # dev server (watch)
yarn build          # compile to JS
yarn start:prod     # run compiled app
npx prisma generate # update Prisma client
npx prisma migrate dev # apply migrations locally
npx prisma studio   # open DB GUI
bun prisma/seed.ts  # run seeding (project config)
```

## Contributing

Follow existing code style and tests. Run `yarn lint` and `yarn test` before opening pull requests.

---

If you'd like, I can also update `src/prisma/prisma.service.ts` to the minimal implementation that extends `PrismaClient` (so `this.prisma.user` is typed correctly). Would you like me to apply that change now?
