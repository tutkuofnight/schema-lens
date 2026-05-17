# AGENTS.md

## Cursor Cloud specific instructions

**Product**: SchemaLens — a fully client-side SPA that visualizes database schemas (Drizzle ORM, Prisma, SQL) as interactive ER diagrams. No backend, no database, no external services.

### Quick reference

| Action | Command |
|--------|---------|
| Install deps | `bun install` |
| Dev server | `bun run dev` (serves at `http://localhost:5173`) |
| Lint | `bun run lint` |
| Type check | `npx tsc -b` |
| Build | `bun run build` |

### Non-obvious notes

- **Bun is the preferred package manager** (`bun.lock` is the lockfile). Install Bun first if not available: `curl -fsSL https://bun.sh/install | bash` then add `~/.bun/bin` to `PATH`.
- **No automated test suite exists** — there is no test framework or test scripts configured. Validation is done via lint (`eslint`), type checking (`tsc -b`), and manual testing in the browser.
- **All parsing is client-side** — there are no environment variables, `.env` files, API endpoints, or external service dependencies. The entire app runs in the browser with state persisted to `localStorage` via Zustand.
- **Monaco Editor loads external assets** — the code editor fetches VS Code web worker scripts from a CDN at runtime, so an internet connection is needed for full editor functionality.
