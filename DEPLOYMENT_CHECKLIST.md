# Pre-Deployment Checklist

Use this checklist before deploying to Render and Netlify.

## Code Quality

- [ ] Run tests locally: `npm run test`
- [ ] Check TypeScript: `npm run typecheck`
- [ ] Test backend build: `npm run build -w backend`
- [ ] Test frontend build: `npm run build -w frontend`
- [ ] Test production run: `npm start -w backend` and verify logs
- [ ] Test frontend production build locally: `npm run serve -w frontend`

## Git & Repository

- [ ] All changes committed and pushed to GitHub
- [ ] No untracked files in repository
- [ ] `.gitignore` excludes environment files
- [ ] No sensitive data in code (API keys, passwords, etc.)

## Backend (Render)

- [ ] `.nvmrc` contains correct Node version
- [ ] `render.yaml` is at project root
- [ ] Build command works: `npm install && npm run build`
- [ ] Start command works: `npm start -w backend`
- [ ] Backend listens on PORT environment variable
- [ ] All environment variables documented in `backend/.env.example`
- [ ] Backend logs indicate successful startup

## Frontend (Netlify)

- [ ] `netlify.toml` is at project root
- [ ] Build command works: `npm install && npm run build -w frontend`
- [ ] Publish directory is correct: `frontend/dist/public`
- [ ] `frontend/.env.example` documents all environment variables
- [ ] SPA routing is configured (index.html redirect in netlify.toml)
- [ ] Asset paths use correct base URL (`/`)

## Environment Variables

- [ ] Created `.env.example` at project root
- [ ] Created `backend/.env.example`
- [ ] Created `frontend/.env.example`
- [ ] **DO NOT** commit `.env` files
- [ ] `.env` files are in `.gitignore`

## Deployment Setup

### Render Setup
- [ ] Created Render account
- [ ] Connected GitHub repository
- [ ] Backend service configured with correct build/start commands
- [ ] Environment variables added to Render dashboard:
  - `NODE_ENV=production`
  - Any other required variables

### Netlify Setup
- [ ] Created Netlify account
- [ ] Connected GitHub repository
- [ ] Frontend build settings configured
- [ ] Environment variable `VITE_API_BASE_URL` set to Render backend URL
- [ ] Deployment settings use `netlify.toml`

## Post-Deployment Testing

### Backend (Render)
- [ ] Service is running (check Render dashboard)
- [ ] Health check passes: `curl https://your-backend-url/api/health`
- [ ] Logs show no errors
- [ ] Manual deploy works via Render dashboard

### Frontend (Netlify)
- [ ] Site is deployed (check Netlify dashboard)
- [ ] Home page loads
- [ ] Can create a room and connect to WebSocket
- [ ] API calls reach backend successfully
- [ ] No CORS errors in browser console

## Monitoring & Maintenance

- [ ] Set up error alerts if available on Render/Netlify
- [ ] Monitor logs regularly
- [ ] Plan for upgrades when free tier limits are reached
- [ ] Schedule regular dependency updates

## Rollback Plan

- [ ] Know how to rollback on Render (previous deployed version)
- [ ] Know how to rollback on Netlify (Deploys tab)
- [ ] Keep backup of production environment variables
