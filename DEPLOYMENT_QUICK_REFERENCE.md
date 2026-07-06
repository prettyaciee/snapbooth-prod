# Deployment Quick Reference

## Files Created for Deployment

✅ **render.yaml** - Render backend configuration
✅ **netlify.toml** - Netlify frontend configuration  
✅ **.nvmrc** - Node.js version specification (22)
✅ **.env.example** - Root environment variables reference
✅ **backend/.env.example** - Backend environment variables reference
✅ **frontend/.env.example** - Frontend environment variables reference
✅ **.gitignore** - Updated with comprehensive exclusions
✅ **DEPLOYMENT.md** - Full deployment guide
✅ **DEPLOYMENT_CHECKLIST.md** - Pre-deployment checklist

## Deployment Sequence

### 1️⃣ Test Locally First
```bash
npm run test              # Run tests
npm run typecheck         # Check types
npm run build -w backend  # Build backend
npm run build -w frontend # Build frontend
npm run dev               # Test locally
```

### 2️⃣ Deploy Backend (Render)

**Setup URL:** https://dashboard.render.com

1. Click "New Web Service"
2. Connect GitHub repo
3. Settings:
   - **Name:** snapbooth-backend
   - **Environment:** Node
   - **Build:** `npm install && npm run build`
   - **Start:** `npm start`
   - **Region:** Oregon (or nearest)
4. Add Environment Variables:
   - `NODE_ENV` = `production`
5. Deploy

**After deployment:**
- Copy your backend URL (e.g., `https://snapbooth-backend.onrender.com`)
- Wait for first successful deploy (logs show "Server listening")

### 3️⃣ Deploy Frontend (Netlify)

**Setup URL:** https://app.netlify.com

1. Click "Add new site" → "Import an existing project"
2. Connect GitHub repo
3. Build settings (auto-filled from netlify.toml):
   - **Build:** `npm install && npm run build -w frontend`
   - **Publish:** `frontend/dist/public`
4. Add Environment Variables:
   - `VITE_API_BASE_URL` = `https://snapbooth-backend.onrender.com/api` (use your backend URL)
   - `NODE_VERSION` = `22`
5. Deploy

**After deployment:**
- Your site URL will be shown (e.g., `https://snapbooth-abc123.netlify.app`)

## Important Notes

### Backend URL Format
```
https://[service-name].onrender.com/api
```

### Frontend Environment Variable
Must be set in Netlify dashboard BEFORE or AFTER first deploy:
```
VITE_API_BASE_URL=https://[your-backend].onrender.com/api
```

### First Deploy Timing
- Render: 2-5 minutes (free tier may take longer)
- Netlify: Usually under 1 minute
- Free tier Render services spin down after 15 minutes of inactivity

## Testing Deployment

### Backend Health Check
```bash
curl https://your-backend-url.onrender.com/api/health
```

### Frontend Connection
1. Visit your Netlify URL
2. Open browser DevTools → Console
3. Should see no CORS errors
4. Try creating a room to test WebSocket connection

## Useful Links

- **Render Dashboard:** https://dashboard.render.com
- **Netlify Dashboard:** https://app.netlify.com
- **Render Docs:** https://render.com/docs
- **Netlify Docs:** https://docs.netlify.com
- **GitHub Settings:** https://github.com/settings/applications

## Environment Variables Summary

| Service | Variable | Value |
|---------|----------|-------|
| Render Backend | `NODE_ENV` | `production` |
| Render Backend | `PORT` | `3001` |
| Netlify Frontend | `VITE_API_BASE_URL` | Backend URL + `/api` |
| Netlify Frontend | `NODE_VERSION` | `22` |

## Git Workflow

```bash
# 1. Make changes locally
git add .
git commit -m "Ready for deployment"

# 2. Push to GitHub
git push origin main

# 3. Both services auto-deploy from render.yaml and netlify.toml
# Monitor progress in dashboards:
# - https://dashboard.render.com
# - https://app.netlify.com
```

## Troubleshooting Quick Links

For detailed troubleshooting, see **DEPLOYMENT.md**

**Quick fixes:**
- Backend won't start: Check logs in Render dashboard
- Frontend 404: Hard refresh (Cmd+Shift+R)
- CORS errors: Verify `VITE_API_BASE_URL` in Netlify env vars
- WebSocket errors: Check backend service is running

## Free Tier Limits

| Platform | Limit |
|----------|-------|
| Render | Auto-sleep after 15 min inactivity |
| Netlify | 300 minutes/month build time |
| Both | Included storage/bandwidth sufficient for indie projects |

## Next Steps

1. ✅ Push all changes to GitHub
2. ✅ Create services on Render and Netlify
3. ✅ Set environment variables
4. ✅ Monitor first deployment
5. ✅ Test both services work together
6. ✅ Update domain settings if using custom domain

---

**Ready to deploy? Follow the sequence above and check DEPLOYMENT_CHECKLIST.md!**
