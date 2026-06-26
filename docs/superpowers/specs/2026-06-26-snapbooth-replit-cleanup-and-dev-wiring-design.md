# SnapBooth Replit Cleanup And Dev Wiring Design

## Goal

Make the `snapbooth` project runnable as a self-contained local codebase by:

1. removing all Replit-specific artifacts and runtime assumptions from the repo
2. restoring a single root command that starts both frontend and backend dev servers together

The target developer experience is the same pattern used in `Desktop/botchabuster`: `npm run dev` from the repo root starts both apps and manages their lifecycle from one parent process.

## Current State

The project is split into two app directories:

- `backend/`
- `frontend/`

The frontend already talks to the backend via relative endpoints:

- HTTP: `/api/...`
- WebSocket: `/api/ws`

That is the correct integration seam for local development and should be preserved.

The repo is not currently self-contained. It still contains monorepo and Replit-specific dependencies and config that assume an external root workspace:

- `frontend/package.json` contains Replit-only Vite plugins
- both `package.json` files use `catalog:` versions that npm cannot resolve on their own
- `backend/package.json` references missing workspace packages
- `frontend/package.json` references a missing workspace package
- both apps contain `.replit-artifact/` directories
- `frontend/vite.config.ts` requires `BASE_PATH` and conditionally enables Replit plugins
- `backend/src/routes/health.ts` imports a schema from a missing `@workspace/api-zod` package

Because of that, the repo cannot be installed and run as an ordinary local npm workspace without cleanup.

## Non-Goals

This work does not:

- merge frontend and backend into one deployable server
- redesign app flows or UI behavior
- add production deployment configuration
- replace relative API usage with environment-variable-based client URLs
- refactor app architecture beyond what is required to remove broken external dependencies

## Recommended Approach

Use an npm workspace root plus a small Node-based dev supervisor script.

This matches the proven pattern already used in `botchabuster`, avoids adding a process-management dependency just to run two commands, and gives explicit control over startup, shutdown, and failure propagation.

## Alternatives Considered

### 1. Root npm workspace plus custom `run-dev.mjs`

Pros:

- matches `botchabuster`
- no extra dependency like `concurrently`
- clear lifecycle handling when one child process exits
- easy to extend with root `build` and `typecheck` commands

Cons:

- requires adding one small root script

### 2. Root scripts with `concurrently`

Pros:

- slightly faster to scaffold

Cons:

- adds a dependency that exists only to orchestrate processes
- less aligned with the existing project pattern the user wants to copy

### 3. Flatten the repo into one package

Pros:

- fewer workspace files

Cons:

- more invasive than necessary
- does not improve the actual dev-server integration story
- risks unnecessary file churn across both apps

## Final Design

### Repository Shape

Add a root workspace layer:

- `package.json`
- `scripts/run-dev.mjs`

Keep the existing app split:

- `frontend/`
- `backend/`

Generate a root `package-lock.json` after installation.

## Replit Cleanup

Remove Replit-specific artifacts from the repo:

- delete `backend/.replit-artifact/`
- delete `frontend/.replit-artifact/`

Remove Replit-only Vite plugins from `frontend/package.json`:

- `@replit/vite-plugin-cartographer`
- `@replit/vite-plugin-dev-banner`
- `@replit/vite-plugin-runtime-error-modal`

Remove Replit-only config behavior from `frontend/vite.config.ts`:

- remove `runtimeErrorOverlay`
- remove conditional imports based on `REPL_ID`
- stop requiring `BASE_PATH`
- use a normal root `base: "/"`

Comments in UI files that mention `@replit` but do not affect behavior may remain unless they create linting or clarity problems. The priority is removing functional Replit coupling, not comment-only strings.

## Monorepo Residue Cleanup

The repo must stop depending on missing external workspace packages.

### Backend

In `backend/package.json`:

- remove `@workspace/api-zod`
- remove `@workspace/db`
- replace `catalog:` versions with explicit versions that npm can install locally

In `backend/src/routes/health.ts`:

- replace the `HealthCheckResponse` import and parse call with a local typed response
- keep the route contract as a simple JSON payload: `{ status: "ok" }`

No current backend code path in the inspected files requires the removed workspace packages for room creation or websocket behavior, so this change is low-risk.

### Frontend

In `frontend/package.json`:

- remove `@workspace/api-client-react`
- replace every `catalog:` version with explicit versions

The inspected frontend app code does not import `@workspace/api-client-react`, so removing it should be safe.

## Root Workspace Design

Add a root `package.json` with:

- `private: true`
- `workspaces: ["frontend", "backend"]`

Root scripts:

- `dev`
- `dev:frontend`
- `dev:backend`
- `build`
- `typecheck`

Expected script behavior:

- `dev` runs both app dev servers through `scripts/run-dev.mjs`
- `dev:frontend` delegates to the frontend workspace
- `dev:backend` delegates to the backend workspace
- `build` runs both workspace builds from root
- `typecheck` runs both workspace typechecks from root

## Dev Supervisor Design

Add `scripts/run-dev.mjs`, modeled after `botchabuster/scripts/run-dev.mjs`.

Responsibilities:

- spawn frontend and backend dev commands from the repo root
- inherit stdio so logs stream directly in the terminal
- track child processes in memory
- if one child fails to start, terminate the other child and exit nonzero
- if one child exits unexpectedly, terminate the other child and exit with the same failure code
- handle `SIGINT` and `SIGTERM` so Ctrl+C stops both processes cleanly

This script should not introduce custom logging complexity beyond lightweight child-process labels for failure reporting.

## Frontend Dev Server Design

The frontend remains a Vite app.

Default local dev behavior:

- host: `0.0.0.0`
- port: `5173`
- base: `/`

Add a Vite dev proxy:

- proxy `/api` to `http://127.0.0.1:3001`
- enable websocket proxying for `/api/ws`

This preserves the existing frontend code, which already uses relative URLs:

- `fetch("/api/rooms")`
- `fetch("/api/rooms/:roomId")`
- websocket connection to `${protocol}//${window.location.host}/api/ws?...`

With the Vite proxy in place, no page or hook rewrites are required for local development.

## Backend Dev Server Design

The backend remains a standalone Express plus WebSocket server.

Required changes:

- add a real dev script that watches TypeScript source and restarts automatically
- default to port `3001` when `PORT` is unset

Recommended implementation:

- use `tsx watch src/index.ts` for `backend` `dev`

Runtime behavior:

- backend listens on `127.0.0.1:3001` or `0.0.0.0:3001`, depending on existing server behavior
- Express routes remain mounted at `/api`
- websocket endpoint remains `/api/ws`

The current backend code already exposes the correct HTTP and websocket paths, so the main backend work is portability, not feature logic.

## Dependency Strategy

Because this repo no longer has access to the original shared workspace root, every unresolved workspace alias and `catalog:` version must be replaced with installable local npm versions.

Version selection rule:

- prefer explicit stable versions already seen in nearby local projects when the same package exists there
- otherwise use current compatible versions consistent with the code already present in the app manifests

The goal is not aggressive dependency modernization. The goal is converting the repo into a locally installable workspace with minimal behavior change.

## Testing Strategy

This work is configuration and integration heavy, so verification must combine build-level checks and real runtime checks.

Required verification:

1. `npm install` from repo root succeeds
2. `npm run typecheck` from repo root succeeds
3. `npm run build` from repo root succeeds
4. `npm run dev` from repo root starts both servers
5. backend health endpoint responds at `/api/healthz`
6. frontend loads in the browser without Replit-specific config failures
7. creating a room from the frontend reaches the backend through the Vite proxy

If any dependency mismatch appears during install or build, fix the manifest or config rather than papering over the error with runtime-only assumptions.

## Risks

### Dependency drift

Replacing `catalog:` values with explicit versions may expose compatibility issues if the original monorepo relied on tightly coordinated package versions.

Mitigation:

- choose conservative versions
- verify with root `typecheck` and `build`

### Hidden workspace imports

Some files not yet inspected may still import code from the old monorepo.

Mitigation:

- search for `@workspace/` references across both apps
- remove or replace any remaining imports before claiming completion

### Dev-server proxy mismatch

The frontend websocket URL depends on same-origin behavior, so the proxy must support websocket upgrades correctly.

Mitigation:

- explicitly configure websocket proxying for `/api/ws`
- verify room creation and live websocket room joining in dev

## Implementation Outline

1. add root npm workspace files and supervisor script
2. remove `.replit-artifact/` directories
3. clean frontend Vite config and manifest
4. clean backend manifest and health route
5. replace unresolved `catalog:` and workspace dependency entries with explicit installable versions
6. install dependencies from root
7. run typecheck and build from root
8. run the unified root dev command and verify frontend-backend communication

## Acceptance Criteria

The task is complete when all of the following are true:

- the repo contains no Replit runtime artifacts or Replit-specific build plugins
- the repo can be installed from its own root with npm
- `npm run dev` from the root starts both frontend and backend together
- frontend requests to `/api` and `/api/ws` work in local development through the Vite proxy
- root `typecheck` and `build` pass

## Open Questions Resolved

- Unified runtime target: two dev servers started by one root command
- Integration model: frontend uses a Vite proxy to backend, not direct environment-based backend URLs
- Process-management pattern: match `botchabuster` by using a root Node supervisor script
