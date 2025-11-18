# Quick Start Guide

Get citation scraping working in **under 10 minutes** using free cloud hosting.

## Step 1: Push to GitHub (1 minute)

If not already done:
```bash
cd /Users/jeffcoy/Projects/Drafts_Action_Get_ChatGPT_Convo
git add .
git commit -m "Add free cloud deployment for iOS support"
git push origin main
```

## Step 2: Deploy to Render.com (5 minutes)

### Create Account
1. Go to https://render.com
2. Click "Get Started" → "Sign up with GitHub"
3. Authorize Render to access your repos

### Deploy the Service
1. Click **"New +"** → **"Web Service"**
2. Click **"Connect a repository"** → Find `drafts-chatgpt-importer`
3. Configure the service:
   - **Name**: `chatgpt-scraper` (or your choice)
   - **Environment**: Select **"Docker"**
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Plan**: **"Free"**
4. Click **"Create Web Service"**

### Wait for Build
- First build takes ~5-10 minutes
- Watch the logs - you'll see:
  - Installing dependencies
  - Installing Playwright browsers
  - Starting server
- When done, status shows "Live" ✅

### Get Your URL
- Your API is now at: `https://chatgpt-scraper.onrender.com` (or your chosen name)
- Test it: Visit `https://YOUR-APP.onrender.com/health`
- Should see: `{"status":"healthy"}`

## Step 3: Update Drafts Action (2 minutes)

1. **Open** `Drafts_Action_With_Citations.js` in your project
2. **Find** line 5:
   ```javascript
   const SCRAPER_API = "https://YOUR-APP-NAME.onrender.com";
   ```
3. **Replace** with your actual URL:
   ```javascript
   const SCRAPER_API = "https://chatgpt-scraper.onrender.com";
   ```
4. **Copy** the entire file

5. **In Drafts app**:
   - Create new Action
   - Add Script step
   - Paste the code
   - Save as "Import ChatGPT (with Citations)"

## Step 4: Test It! (1 minute)

1. Go to ChatGPT and share a conversation with citations
2. Copy the share URL
3. In Drafts, create a new draft
4. Paste the URL
5. Run your new action

**First request will take 30-60 seconds** (service spins up)  
After that, requests are fast!

## Expected Output

You should get a new draft with:
- ✅ Conversation title
- ✅ Source link
- ✅ **Citations section with actual URLs**
- ✅ Clean User/ChatGPT messages
- ✅ Citation numbers linked to references

## Troubleshooting

### "Failed to fetch conversation"
- Check that the ChatGPT share URL is valid
- Make sure it's a public share link

### Citations not appearing
- Check that `SCRAPER_API` URL is correct in your Drafts action
- Test the scraper directly: `https://YOUR-APP.onrender.com/scrape?url=SHARE_URL`
- First request after 15 min of inactivity takes longer (service spins up)

### "Service Unavailable"
- **This is normal on free tier!**
- Render spins down after 15 minutes of inactivity
- Just wait 30-60 seconds and try again
- The service will wake up automatically

### Still not working?
1. Check Render dashboard → Logs for errors
2. Verify your GitHub repo has all the files
3. Make sure you selected "Docker" as environment
4. Try redeploying: Render dashboard → Manual Deploy → "Clear build cache & deploy"

## Alternative: Use Railway or Fly.io

If Render doesn't work for you, see [DEPLOYMENT.md](DEPLOYMENT.md) for:
- Railway.app setup (requires credit card but still free)
- Fly.io setup (CLI-based, more advanced)

Both work the same way once deployed!

## What's Next?

- The scraper runs 24/7 on Render's free tier (750 hours/month)
- Auto-redeploys when you push to GitHub
- No maintenance required
- Use it from iOS or Mac anytime!

Enjoy! 🎉
