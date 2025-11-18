# Authentication Setup for Citation Extraction

To extract citation URLs, the scraper needs to access ChatGPT as if you're logged in. Here's how to set it up:

## Step 1: Get Your OpenAI Session Token

1. **Open ChatGPT** in your browser: https://chatgpt.com
2. **Make sure you're logged in**
3. **Open Developer Tools**:
   - Chrome/Edge: Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Safari: Enable Developer menu in Preferences, then `Cmd+Option+I`
   - Firefox: Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)

4. **Go to the Application tab** (Chrome/Edge) or **Storage tab** (Firefox)
5. **Navigate to Cookies** → `https://chatgpt.com`
6. **Find the cookie named**: `__Secure-next-auth.session-token`
7. **Copy the entire Value** (it's a long string starting with `eyJ...`)

## Step 2: Add Token to Your Drafts Action

1. **Open your Drafts action** (the one with `Drafts_Action_With_Citations.js`)
2. **Find line 11** which says:
   ```javascript
   const OPENAI_SESSION_TOKEN = "YOUR_SESSION_TOKEN_HERE";
   ```
3. **Replace `YOUR_SESSION_TOKEN_HERE`** with your actual token:
   ```javascript
   const OPENAI_SESSION_TOKEN = "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0..."; // Your actual token
   ```
4. **Save the action**

## Step 3: Test It!

1. Create a new draft in Drafts
2. Paste a ChatGPT conversation URL (either `/share/` or `/c/` format)
3. Run your action
4. You should now see:
   - `<!-- Citations: found X -->` (where X > 0)
   - Citation tags replaced with actual `[Cite](URL)` links
   - A Citations section at the top with numbered links

## Security Notes

⚠️ **IMPORTANT**: Your session token is like a password!

- **Keep it private** - don't share your Drafts action publicly with the token in it
- **Don't commit it to Git** - the token is sensitive
- **Token expires** - you may need to get a new one periodically (when you log out or after ~30 days)
- **Only stored in Drafts** - it's not sent anywhere except to your own scraper on Render

## Troubleshooting

### "Citations: token not configured"
- You forgot to add your token or it's still the default `YOUR_SESSION_TOKEN_HERE`
- Add your actual token from Step 1

### "Citations: found 0" (even with token)
- Your token might have expired - get a new one
- The conversation might not have any citations
- Try using the `/c/` URL instead of `/share/`

### "Citations: API failed"
- Check that your Render service is deployed and running
- Test the health endpoint: `https://YOUR-APP.onrender.com/health`
- First request after inactivity takes 30-60 seconds

### Token expired
- Tokens typically last 30 days or until you log out
- Get a new token following Step 1
- Update line 11 in your Drafts action

## Privacy

Your session token is:
- ✅ Only sent to YOUR scraper (on Render)
- ✅ Not logged by the scraper
- ✅ Stored only in your Drafts app (on your device)
- ✅ Not visible to anyone else
- ✅ Can be revoked by logging out of ChatGPT

The scraper uses it only to:
- Load the ChatGPT page as if you're logged in
- Extract citation links
- Returns just the URLs (no conversation content)

## Alternative: Environment Variable (More Secure)

For better security, you can store the token on Render instead:

1. **Go to Render Dashboard** → Your Service → Environment
2. **Add environment variable**:
   - Key: `OPENAI_SESSION_TOKEN`
   - Value: `your_token_here`
3. **Update Drafts action** to pass token via different method (requires code changes)

This way the token isn't stored in your Drafts action.

---

Questions? Check the main README or create an issue on GitHub.
