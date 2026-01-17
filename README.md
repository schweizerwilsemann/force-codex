# ForceCodeX

ForceCodeX is a lightweight coding-practice platform designed for 1st- and 2nd-year university students learning Data Structures & Algorithms (DSA) and Object-Oriented Programming (OOP). The project is structured like popular platforms (LeetCode / HackerRank) so students can practice, submit, and test solutions locally.

## Who is this for

- Students in early CS coursework learning DSA and OOP.
- Instructors or TAs who want a local, extensible playground for assignments and practice problems.

## Features

- Example frontend and backend (NestJS + Next.js) to demonstrate full-stack workflow.
- Database-backed problem storage using Prisma and Postgres.
- Local seeding and test scripts so students can run examples and verify solutions.

## Tech stack

- Backend: FastAPI, Postgres
- Frontend: Next.js
- Tooling: Yarn / npm (Bun compatible), TypeScript, Jest

## Quick start

1. Set up a Postgres database and copy `backend/.env.example` to `backend/.env` (or create `backend/.env`) and set `DATABASE_URL`.

2. Backend — install, generate Prisma client, and run:

```bash
cd fastapi
python main.py
```

If you prefer Bun:

```bash
cd fastapi
bun  run main.py
```

3. Frontend — install and run:

```bash
cd frontend
yarn install
yarn dev
```

or with Bun:

```bash
cd frontend
bun install
bun dev
```

## Running tests

Run unit and integration tests from the respective folders:

```bash
cd fastapi
python test
```

## How to use / extend

- Add new practice problems and test cases in the backend feature modules and expose endpoints for the frontend to fetch problems and submit solutions.
- Encourage small, well-typed functions and include unit tests demonstrating expected behavior.

## Contributing

- Follow existing TypeScript and lint rules. Run `yarn lint` and `yarn test` before submitting PRs.
- Keep solutions readable and include comments when a solution uses a non-obvious approach.

## Learning goals

- Build confidence solving DSA problems (arrays, strings, linked lists, trees, graphs, dynamic programming).
- Practice OOP design, interfaces, and modular code.
- Learn to test and debug code in a full-stack environment.

## License

MIT
