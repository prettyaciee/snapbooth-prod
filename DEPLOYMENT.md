# Snapbooth Deployment Guide

This project is a monorepo containing a Node.js backend and React frontend, configured for deployment to Render and Netlify.

## Quick Start

### Backend (Render)

**Prerequisites:**
- Render account (https://render.com)

**Steps:**
1. Go to https://render.com/dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name:** snapbooth-backend (or your choice)
   - **Environment:** Node
   - **Build Command:** `npm install && npm run build -w backend`
   - **Start Command:** `npm start -w backend`
   - **Node Version:** 22 (auto-detected from .nvmrc)
5. Add environment variables in Render dashboard:
   - `NODE_ENV`: `production`
   - `PORT`: `3001` (optional, auto-set)
6. Click "Create Web Service"

**Note:** Render provides a free tier (auto-spins down after 15 minutes of inactivity). For production, upgrade to a paid plan.

### Frontend (Netlify)

**Prerequisites:**
- Netlify account (https://netlify.com)
- Know your backend URL from Render deployment

**Steps:**
1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub repository
4. Choose branch (e.g., `main`)
5. Configure build settings (these are auto-detected from `netlify.toml`):
   - **Build Command:** `npm install && npm run build -w frontend`
   - **Publish Directory:** `frontend/dist/public`
6. Add environment variables in Netlify dashboard:
   - `VITE_API_BASE_URL`: `https://your-render-backend-url.onrender.com/api`
     (Replace `your-render-backend-url` with your actual Render service name)
   - `NODE_VERSION`: `22`
7. Click "Deploy"

## Configuration Files

### `render.yaml`
Specifies Render deployment configuration:
- Builds with `npm run build -w backend`
- Starts with `npm start -w backend`
- Runs on Node 22
- Sets production environment

### `netlify.toml`
Specifies Netlify deployment configuration:
- Builds frontend with Vite
- Enables SPA routing (redirects to index.html for client-side routing)
- Sets cache headers for assets and HTML
- Adds security headers

### `.nvmrc`
Specifies Node.js version (22) for all platforms.

## Environment Variables

### Backend (`.env`)
```bash
PORT=3001
NODE_ENV=production
```

### Frontend (`.env`)
```bash
VITE_API_BASE_URL=https://your-render-backend-url.onrender.com/api
```

See `.env.example` and `frontend/.env.example` for reference.

## Deployment Process

### Initial Deployment

1. **Backend:**
   - Push code to GitHub
   - Render auto-builds from `render.yaml`
   - Get your Render URL (e.g., `https://snapbooth-backend.onrender.com`)

2. **Frontend:**
   - Set `VITE_API_BASE_URL` environment variable in Netlify dashboard
   - Push code to GitHub or deploy manually
   - Netlify auto-builds from `netlify.toml`

### Redeployment

Both services auto-redeploy on GitHub push. To manually redeploy:

**Render:** Dashboard → Service → Manual Deploy
**Netlify:** Dashboard → Deploys → Deploy to production

## Local Development

```bash
# Install dependencies
npm install

# Run both services
npm run dev

# Or separately
npm run dev:backend  # Starts on port 3001
npm run dev:frontend # Starts on port 5173
```

Frontend automatically connects to `http://localhost:3001/api` for development.

## Troubleshooting

### Frontend can't reach backend
- Check `VITE_API_BASE_URL` environment variable in Netlify
- Ensure backend is running and accessible
- Check browser console for CORS errors
- Verify WebSocket connection (check Network tab)

### Backend won't start on Render
- Check build logs in Render dashboard
- Verify `npm run build -w backend` works locally
- Check Node version (should be 22)

### Page not found on Netlify
- Verify publish directory is `frontend/dist/public`
- Check `netlify.toml` redirects rule is present
- Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)

## Platform Features

### Render
- Free tier with auto-sleep after 15 minutes
- Auto-scaling on paid plans
- GitHub integration
- Environment variables management
- Automatic redeploys on push

### Netlify
- Free tier with unlimited sites
- Built-in continuous deployment
- Instant rollbacks
- DNS management
- Forms, functions, analytics (optional)

## Security

- Backend runs in production mode (`NODE_ENV=production`)
- Netlify headers include security policies (X-Frame-Options, X-Content-Type-Options, etc.)
- Environment variables are not exposed to client
- Frontend build is optimized and minified

## Scaling Considerations

- **Render:** Free tier has limited resources. Upgrade to Standard ($10/month) for better performance
- **Netlify:** Free tier is suitable for most projects. Analytics and advanced features available on paid plans
- **WebSocket:** Both platforms support WebSocket connections
- **CORS:** Backend has CORS enabled for frontend origin

## Support

- Render: https://render.com/support
- Netlify: https://docs.netlify.com
