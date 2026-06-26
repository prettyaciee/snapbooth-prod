# SnapBooth Replit Cleanup And Dev Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `snapbooth` installable and runnable from its own root, with `npm run dev` starting both frontend and backend dev servers and all Replit-specific coupling removed.

**Architecture:** Keep `frontend/` and `backend/` as separate workspace apps. Add a root npm workspace and a small Node supervisor script, then make both app manifests and TypeScript configs self-contained so Vite can proxy `/api` and `/api/ws` to the backend on a fixed local port.

**Tech Stack:** npm workspaces, Node.js, TypeScript, Express, ws, Vite, React, Tailwind CSS 4

---

## File Map

- Create: `package.json`
  Purpose: root npm workspace manifest and unified scripts
- Create: `scripts/run-dev.mjs`
  Purpose: start and supervise both dev servers from one root command
- Create: `tsconfig.base.json`
  Purpose: shared TypeScript base config that replaces the missing external monorepo config
- Create: `.gitignore`
  Purpose: ignore local install/build artifacts generated inside `snapbooth/`
- Modify: `backend/package.json`
  Purpose: remove missing workspace deps, add installable local versions, add a real dev command
- Modify: `backend/tsconfig.json`
  Purpose: point to the new local TS base config and remove dead project references
- Modify: `backend/src/index.ts`
  Purpose: default backend port to `3001` when `PORT` is unset
- Modify: `backend/src/routes/health.ts`
  Purpose: remove the missing `@workspace/api-zod` dependency and keep a local typed health response
- Delete: `backend/.replit-artifact/`
  Purpose: remove Replit runtime artifacts
- Modify: `frontend/package.json`
  Purpose: remove Replit plugins, remove missing workspace deps, replace `catalog:` aliases with explicit versions
- Modify: `frontend/tsconfig.json`
  Purpose: point to the new local TS base config and remove dead project references
- Modify: `frontend/vite.config.ts`
  Purpose: remove Replit-specific config, default to `/`, and proxy `/api` plus websocket traffic to the backend
- Delete: `frontend/.replit-artifact/`
  Purpose: remove Replit runtime artifacts

### Task 1: Create the local workspace scaffold

**Files:**
- Create: `package.json`
- Create: `scripts/run-dev.mjs`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Modify: `backend/tsconfig.json`
- Modify: `frontend/tsconfig.json`

- [ ] **Step 1: Run the root workspace check and confirm it fails**

Run: `npm install`

Expected: fail with an error equivalent to `ENOENT: no such file or directory, open '.../snapbooth/package.json'`

- [ ] **Step 2: Add the root workspace manifest**

Create `package.json`:

```json
{
  "name": "snapbooth",
  "private": true,
  "workspaces": [
    "frontend",
    "backend"
  ],
  "scripts": {
    "dev": "node scripts/run-dev.mjs",
    "dev:frontend": "npm run dev -w frontend",
    "dev:backend": "npm run dev -w backend",
    "build": "npm run build --workspaces",
    "typecheck": "npm run typecheck --workspaces"
  }
}
```

- [ ] **Step 3: Add the root dev supervisor**

Create `scripts/run-dev.mjs`:

```js
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptsDir, "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

export const devCommands = [
  { name: "frontend", args: ["run", "dev:frontend"] },
  { name: "backend", args: ["run", "dev:backend"] },
];

export function runDev() {
  const children = new Map();
  let shuttingDown = false;

  const stopAll = (signal = "SIGTERM") => {
    shuttingDown = true;

    for (const child of children.values()) {
      if (!child.killed) {
        child.kill(signal);
      }
    }
  };

  for (const command of devCommands) {
    const child = spawn(npmCommand, command.args, {
      cwd: repoRoot,
      env: process.env,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    children.set(command.name, child);

    child.on("error", (error) => {
      console.error(`[dev:${command.name}] Failed to start: ${error.message}`);
      stopAll();
      process.exitCode = 1;
    });

    child.on("exit", (code, signal) => {
      children.delete(command.name);

      if (shuttingDown) {
        return;
      }

      const exitCode = code ?? (signal ? 1 : 0);
      console.error(
        `[dev:${command.name}] exited${signal ? ` from ${signal}` : ""} with code ${exitCode}.`,
      );
      stopAll();
      process.exit(exitCode);
    });
  }

  process.once("SIGINT", () => stopAll("SIGINT"));
  process.once("SIGTERM", () => stopAll("SIGTERM"));
}

const scriptPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";

if (import.meta.url === scriptPath) {
  runDev();
}
```

- [ ] **Step 4: Add the shared TS base and ignore rules**

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

Create `.gitignore`:

```gitignore
node_modules/
backend/node_modules/
frontend/node_modules/
backend/dist/
frontend/dist/
backend/.tsbuildinfo
frontend/.tsbuildinfo
npm-debug.log*
```

- [ ] **Step 5: Point both apps at the new local TypeScript base**

Replace `backend/tsconfig.json` with:

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo",
    "outDir": "dist",
    "rootDir": "src",
    "moduleResolution": "node",
    "types": ["node"]
  },
  "include": ["src"]
}
```

Replace `frontend/tsconfig.json` with:

```json
{
  "extends": "../tsconfig.base.json",
  "include": ["src/**/*"],
  "exclude": ["node_modules", "build", "dist", "**/*.test.ts"],
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo",
    "noEmit": true,
    "jsx": "preserve",
    "lib": ["esnext", "dom", "dom.iterable"],
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "moduleResolution": "bundler",
    "types": ["node", "vite/client"],
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

- [ ] **Step 6: Run the workspace check again and confirm the failure has moved forward**

Run: `npm install`

Expected: fail on unresolved workspace or `catalog:` dependencies rather than missing root files

- [ ] **Step 7: Commit**

Run:

```bash
git add package.json scripts/run-dev.mjs tsconfig.base.json .gitignore backend/tsconfig.json frontend/tsconfig.json
git commit -m "build: add snapbooth workspace scaffold"
```

### Task 2: Make both workspace manifests installable

**Files:**
- Modify: `backend/package.json`
- Modify: `frontend/package.json`

- [ ] **Step 1: Run install to verify manifest resolution currently fails**

Run: `npm install`

Expected: fail with an error equivalent to unsupported `catalog:` protocol or unresolved `workspace:*` dependencies

- [ ] **Step 2: Replace the backend manifest with a self-contained package**

Replace `backend/package.json` with:

```json
{
  "name": "snapbooth-backend",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "node ./build.mjs",
    "start": "node --enable-source-maps ./dist/index.mjs",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "express": "^5.2.1",
    "pino": "^9.14.0",
    "pino-http": "^10.5.0",
    "ws": "^8.21.0"
  },
  "devDependencies": {
    "@types/cookie-parser": "^1.4.10",
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.6",
    "@types/node": "^22.16.5",
    "@types/ws": "^8.18.1",
    "esbuild": "0.27.3",
    "esbuild-plugin-pino": "^2.3.3",
    "pino-pretty": "^13.1.3",
    "thread-stream": "3.1.0",
    "tsx": "^4.20.3",
    "typescript": "^5.8.3"
  }
}
```

- [ ] **Step 3: Replace the frontend manifest with explicit installable versions**

Replace `frontend/package.json` with:

```json
{
  "name": "snapbooth-frontend",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --config vite.config.ts --host 0.0.0.0",
    "build": "vite build --config vite.config.ts",
    "serve": "vite preview --config vite.config.ts --host 0.0.0.0",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": {
    "@hookform/resolvers": "^3.10.0",
    "@radix-ui/react-accordion": "^1.2.4",
    "@radix-ui/react-alert-dialog": "^1.1.7",
    "@radix-ui/react-aspect-ratio": "^1.1.3",
    "@radix-ui/react-avatar": "^1.1.4",
    "@radix-ui/react-checkbox": "^1.1.5",
    "@radix-ui/react-collapsible": "^1.1.4",
    "@radix-ui/react-context-menu": "^2.2.7",
    "@radix-ui/react-dialog": "^1.1.7",
    "@radix-ui/react-dropdown-menu": "^2.1.7",
    "@radix-ui/react-hover-card": "^1.1.7",
    "@radix-ui/react-label": "^2.1.3",
    "@radix-ui/react-menubar": "^1.1.7",
    "@radix-ui/react-navigation-menu": "^1.2.6",
    "@radix-ui/react-popover": "^1.1.7",
    "@radix-ui/react-progress": "^1.1.3",
    "@radix-ui/react-radio-group": "^1.2.4",
    "@radix-ui/react-scroll-area": "^1.2.4",
    "@radix-ui/react-select": "^2.1.7",
    "@radix-ui/react-separator": "^1.1.3",
    "@radix-ui/react-slider": "^1.2.4",
    "@radix-ui/react-slot": "^1.2.0",
    "@radix-ui/react-switch": "^1.1.4",
    "@radix-ui/react-tabs": "^1.1.4",
    "@radix-ui/react-toast": "^1.2.7",
    "@radix-ui/react-toggle": "^1.1.3",
    "@radix-ui/react-toggle-group": "^1.1.3",
    "@radix-ui/react-tooltip": "^1.2.0",
    "@tailwindcss/typography": "^0.5.15",
    "@tailwindcss/vite": "4.1.12",
    "@tanstack/react-query": "^5.83.0",
    "@types/node": "^22.16.5",
    "@types/react": "^18.3.23",
    "@types/react-dom": "^18.3.7",
    "@vitejs/plugin-react": "4.7.0",
    "class-variance-authority": "0.7.1",
    "clsx": "2.1.1",
    "cmdk": "^1.1.1",
    "date-fns": "^3.6.0",
    "embla-carousel-react": "^8.6.0",
    "framer-motion": "^11.0.0",
    "input-otp": "^1.4.2",
    "lucide-react": "0.487.0",
    "next-themes": "^0.4.6",
    "react": "18.3.1",
    "react-day-picker": "^9.11.1",
    "react-dom": "18.3.1",
    "react-hook-form": "^7.55.0",
    "react-icons": "^5.4.0",
    "react-resizable-panels": "^2.1.7",
    "recharts": "^2.15.2",
    "sonner": "^2.0.7",
    "tailwind-merge": "3.2.0",
    "tailwindcss": "4.1.12",
    "tw-animate-css": "^1.4.0",
    "vaul": "^1.1.2",
    "vite": "6.3.5",
    "wouter": "^3.3.5",
    "zod": "^3.25.76"
  }
}
```

- [ ] **Step 4: Run install and confirm it succeeds**

Run: `npm install`

Expected: success with a new root `package-lock.json` and installed workspace dependencies

- [ ] **Step 5: Commit**

Run:

```bash
git add backend/package.json frontend/package.json package-lock.json
git commit -m "build: replace replit workspace dependencies"
```

### Task 3: Remove Replit runtime coupling and wire local dev behavior

**Files:**
- Modify: `backend/src/index.ts`
- Modify: `backend/src/routes/health.ts`
- Modify: `frontend/vite.config.ts`
- Delete: `backend/.replit-artifact/`
- Delete: `frontend/.replit-artifact/`

- [ ] **Step 1: Run the backend health typecheck and confirm it fails for the missing schema import**

Run: `npm run typecheck -w backend`

Expected: fail with an error equivalent to `Cannot find module '@workspace/api-zod'`

- [ ] **Step 2: Replace the backend startup file so local development defaults to port 3001**

Replace `backend/src/index.ts` with:

```ts
import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { setupWebSocketServer } from "./lib/wsServer";

const rawPort = process.env["PORT"] ?? "3001";
const port = Number(rawPort);

if (!Number.isInteger(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = createServer(app);
setupWebSocketServer(server);

server.listen(port, () => {
  logger.info({ port }, "Server listening");
});
```

- [ ] **Step 3: Replace the health route with a local typed response**

Replace `backend/src/routes/health.ts` with:

```ts
import { Router, type IRouter } from "express";

type HealthCheckResponse = {
  status: "ok";
};

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data: HealthCheckResponse = { status: "ok" };
  res.json(data);
});

export default router;
```

- [ ] **Step 4: Replace the Vite config with a local-only configuration**

Replace `frontend/vite.config.ts` with:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const rawPort = process.env.PORT ?? "5173";
const port = Number(rawPort);

if (!Number.isInteger(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
```

- [ ] **Step 5: Delete the Replit artifact directories**

Run:

```bash
rm -rf backend/.replit-artifact frontend/.replit-artifact
```

On Windows PowerShell, use:

```powershell
Remove-Item -LiteralPath 'backend\.replit-artifact' -Recurse -Force
Remove-Item -LiteralPath 'frontend\.replit-artifact' -Recurse -Force
```

- [ ] **Step 6: Search for leftover monorepo and Replit references**

Run:

```powershell
Get-ChildItem -Recurse -File 'backend\src','frontend\src' |
  Select-String -Pattern '@workspace/|@replit/|REPL_ID|BASE_PATH|runtimeErrorOverlay'
```

Expected: no matches

- [ ] **Step 7: Run both workspace typechecks**

Run: `npm run typecheck`

Expected: both workspaces pass without missing config or missing import errors

- [ ] **Step 8: Commit**

Run:

```bash
git add backend/src/index.ts backend/src/routes/health.ts frontend/vite.config.ts backend/.replit-artifact frontend/.replit-artifact
git commit -m "build: remove replit runtime wiring"
```

### Task 4: Prove the two-dev-server workflow end to end

**Files:**
- Test: `package.json`
- Test: `scripts/run-dev.mjs`
- Test: `frontend/vite.config.ts`
- Test: `backend/src/index.ts`

- [ ] **Step 1: Run the full build and confirm it passes before starting dev servers**

Run: `npm run build`

Expected: both frontend and backend build commands exit with code `0`

- [ ] **Step 2: Start the unified root dev command**

Run: `npm run dev`

Expected:

- one frontend Vite server starts on `http://127.0.0.1:5173`
- one backend server starts on `http://127.0.0.1:3001`
- stopping the root process with `Ctrl+C` shuts both down

- [ ] **Step 3: Verify backend health directly**

Run:

```bash
curl -i http://127.0.0.1:3001/api/healthz
```

Expected:

- HTTP `200`
- response body `{"status":"ok"}`

- [ ] **Step 4: Verify the Vite proxy hits the backend**

Run:

```bash
curl -i http://127.0.0.1:5173/api/healthz
```

Expected:

- HTTP `200`
- response body `{"status":"ok"}`

- [ ] **Step 5: Verify room creation through the frontend dev server**

Run:

```bash
curl -i -X POST http://127.0.0.1:5173/api/rooms -H "Content-Type: application/json" -d "{\"groupSize\":2}"
```

Expected:

- HTTP `201`
- JSON body containing `roomId`, `hostId`, and `groupSize: 2`

- [ ] **Step 6: Verify the frontend shell still renders**

Run:

```bash
curl -i http://127.0.0.1:5173/
```

Expected:

- HTTP `200`
- HTML document from Vite, not a proxy error page

- [ ] **Step 7: Commit**

Run:

```bash
git add package.json scripts/run-dev.mjs backend frontend
git commit -m "feat: wire snapbooth frontend and backend dev workflow"
```
