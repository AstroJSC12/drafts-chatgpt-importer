# Free Cloud Deployment Guide

This guide shows you how to deploy the ChatGPT Citation Scraper to **100% free** cloud platforms that work from iOS.

---

## Option 1: Render.com (Recommended ⭐)

**Why Render.com?**
- ✅ 750 hours/month free (enough for 24/7 uptime)
- ✅ No credit card required
- ✅ Auto-deploy from GitHub
- ✅ Built-in HTTPS
- ✅ Easy setup (5 minutes)

### Setup Steps

1. **Push your code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Add cloud deployment files"
   git push origin main
   ```

2. **Create Render account**:
   - Go to https://render.com
   - Sign up with GitHub (no credit card needed)

3. **Create new Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repo: `AstroJSC12/drafts-chatgpt-importer`
   - Configure:
     - **Name**: `chatgpt-citation-scraper` (or your choice)
     - **Environment**: `Docker`
     - **Plan**: `Free`
     - **Region**: Choose closest to you
   - Click "Create Web Service"

4. **Wait for deployment** (~5-10 minutes first time)
   - Render will automatically build and deploy
   - You'll get a URL like: `https://chatgpt-citation-scraper.onrender.com`

5. **Test it**:
   - Visit: `https://YOUR-APP.onrender.com/health`
   - Should return: `{"status":"healthy"}`

6. **Use in Drafts**:
   - Your API endpoint: `https://YOUR-APP.onrender.com/scrape?url=CHATGPT_URL`

### Important Notes
- **First request may be slow** (30-60 seconds) - free tier spins down after 15 minutes of inactivity
- Subsequent requests are fast while service is active
- Auto-deploys when you push to GitHub

---

## Option 2: Railway.app

**Why Railway?**
- ✅ $5 free credit/month (enough for light usage)
- ✅ Fast deployment
- ✅ Nice dashboard
- ⚠️ Requires credit card (not charged unless you exceed free tier)

### Setup Steps

1. **Create Railway account**:
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create new project**:
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repo: `drafts-chatgpt-importer`
   - Railway auto-detects Dockerfile

3. **Configure**:
   - Railway automatically uses `Dockerfile`
   - Add environment variable: `NODE_ENV=production`
   - Deploy!

4. **Get your URL**:
   - Click "Settings" → "Generate Domain"
   - You'll get: `https://YOUR-APP.railway.app`

5. **Test**:
   - Visit: `https://YOUR-APP.railway.app/health`

---

## Option 3: Fly.io

**Why Fly.io?**
- ✅ Generous free tier (3 VMs, 3GB storage)
- ✅ Fast global edge network
- ✅ Auto-scaling
- ⚠️ Requires credit card (not charged on free tier)
- ⚠️ CLI-based deployment

### Setup Steps

1. **Install Fly CLI**:
   ```bash
   brew install flyctl
   ```

2. **Login**:
   ```bash
   fly auth login
   ```

3. **Launch app** (from project directory):
   ```bash
   fly launch
   ```
   - It will detect `fly.toml` and ask to confirm settings
   - Say **Yes** to deploy now

4. **Get your URL**:
   - After deployment: `https://chatgpt-citation-scraper.fly.dev`

5. **Future deployments**:
   ```bash
   fly deploy
   ```

---

## Updating Your Drafts Action

Once deployed, update your Drafts action to call the cloud API:

```javascript
// In Drafts_Action_Get_ChatGPT_Convo.js
// Add this near the top after extracting the shareURL:

const SCRAPER_API = "https://YOUR-APP.onrender.com"; // or .railway.app or .fly.dev

// Try to fetch citations from the scraper
const citationHttp = HTTP.create();
const citationResponse = citationHttp.request({
    url: `${SCRAPER_API}/scrape?url=${encodeURIComponent(shareURL)}`,
    method: "GET"
});

let citations = [];
if (citationResponse.success) {
    try {
        const citationData = JSON.parse(citationResponse.responseText);
        if (citationData.success && citationData.citations) {
            citations = citationData.citations;
        }
    } catch (e) {
        console.log("Could not parse citation data");
    }
}

// Then use citations array to add citation links to your markdown output
```

---

## Comparison Table

| Platform | Free Tier | Credit Card | Setup Time | Best For |
|----------|-----------|-------------|------------|----------|
| **Render.com** | 750 hrs/month | ❌ No | 5 min | **Recommended - easiest!** |
| **Railway.app** | $5 credit/month | ✅ Yes | 3 min | Fast setup, nice UI |
| **Fly.io** | 3 VMs free | ✅ Yes | 10 min | Advanced users, global edge |

---

## Troubleshooting

### Deployment fails
- Check build logs in platform dashboard
- Ensure Dockerfile is in repo root
- Verify package.json has correct dependencies

### "Service Unavailable" errors
- **Render.com**: First request after inactivity takes 30-60s to spin up
- Wait and retry
- Consider upgrading to paid tier for always-on

### No citations returned
- Test the scraper directly: `https://YOUR-APP/scrape?url=CHATGPT_URL`
- Check response for errors
- ChatGPT may have changed their HTML structure

### Rate limiting
- All platforms have rate limits on free tier
- Render: Reasonable limits for personal use
- Add delays between requests if needed

---

## Security Notes

- All platforms provide HTTPS automatically
- No API keys stored in these configs
- To add authentication later, use environment variables
- Conversation URLs are not logged (see server.js code)

---

## Next Steps

1. Choose a platform (recommend Render.com for simplest setup)
2. Deploy following steps above
3. Test the API endpoint
4. Update your Drafts action with the new URL
5. Test from iOS!

**Need help?** Check platform documentation:
- Render: https://render.com/docs
- Railway: https://docs.railway.app
- Fly.io: https://fly.io/docs
