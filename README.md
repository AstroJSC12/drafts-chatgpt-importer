# Drafts Action - ChatGPT Conversation Importer

Import ChatGPT shared conversations into clean, formatted Markdown with optional citation extraction.

## Features

✅ **Works on iOS and macOS** - Import conversations from anywhere  
✅ **Clean Markdown output** - Well-formatted User/ChatGPT conversation structure  
✅ **Citation extraction** - Optional cloud scraper to get actual citation URLs  
✅ **Entity cleanup** - Removes annotation artifacts from ChatGPT responses  
✅ **URL cleaning** - Removes tracking parameters  
✅ **100% Free deployment** - Multiple free cloud hosting options  

## Quick Start

### Basic Version (No Citations)
1. Copy `Drafts_Action_Get_ChatGPT_Convo.js`
2. In Drafts app: create new Action → add Script step → paste code
3. Paste a ChatGPT share URL in a draft and run the action

### Advanced Version (With Citations)
To extract actual citation URLs (requires cloud deployment):

1. **Deploy the scraper** to a free platform (see [DEPLOYMENT.md](DEPLOYMENT.md))
   - Render.com (recommended) - 5 minutes setup
   - Railway.app or Fly.io alternatives

2. **Update the Drafts action**:
   - Copy `Drafts_Action_With_Citations.js`
   - Change `SCRAPER_API` to your deployed URL
   - Create new Action in Drafts with this script

3. **Run it!** Citations will be automatically extracted and listed

## Project Structure

```
├── Drafts_Action_Get_ChatGPT_Convo.js    # Basic version (no citations)
├── Drafts_Action_With_Citations.js       # Advanced version (with citations)
├── server.js                             # Cloud scraper API
├── Dockerfile                            # Container config for deployment
├── DEPLOYMENT.md                         # Step-by-step deployment guide
├── TODO.md                               # Future improvements
└── deployment configs/                   # Platform-specific configs
    ├── render.yaml
    ├── railway.json
    └── fly.toml
```

## How It Works

### Basic Flow
1. Extracts ChatGPT share URL from draft
2. Fetches conversation via ChatGPT's backend API
3. Cleans up entity annotations and citation tags
4. Formats as clean Markdown
5. Creates new draft with result

### With Citations (Optional)
1. Same as above, plus:
2. Calls your deployed scraper API
3. Scraper uses headless browser to load the share page
4. Extracts actual citation URLs from rendered HTML
5. Replaces citation tags with real links
6. Adds citation list to output

## Free Cloud Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for detailed instructions on deploying to:

| Platform | Free Tier | Setup Time | Best For |
|----------|-----------|------------|----------|
| [Render.com](https://render.com) | 750 hrs/month | 5 min | **Recommended** |
| [Railway.app](https://railway.app) | $5 credit/month | 3 min | Fast setup |
| [Fly.io](https://fly.io) | 3 VMs free | 10 min | Advanced users |

All platforms support Docker and Playwright for browser automation.

## Requirements

- Drafts app (iOS/macOS)
- For citation scraping: Free cloud account (Render/Railway/Fly)

## Known Limitations

- **First request may be slow** on free tiers (30-60s as service spins up)
- **ChatGPT API doesn't include citations** - that's why we need browser scraping
- **Some entity annotations** with unicode quotes may slip through (rare)

## Troubleshooting

**"Failed to fetch conversation"**
- Check that the ChatGPT share URL is valid and public

**Citations not appearing**
- Verify your scraper API is deployed and URL is correct
- Check `SCRAPER_API` setting in the Drafts action
- Test scraper directly: `https://your-api.com/scrape?url=SHARE_URL`

**"Service Unavailable" errors**
- Normal on Render.com free tier after inactivity
- Wait 30-60 seconds and retry
- Service will spin back up

## Version History

- **v2.0**: Added citation scraping via cloud deployment
- **v1.5**: Improved entity annotation cleanup (unicode quotes)
- **v1.0**: Initial version with basic import functionality

## Contributing

This is a personal project, but feel free to fork and modify for your needs.

## License

MIT - Use freely for personal projects
