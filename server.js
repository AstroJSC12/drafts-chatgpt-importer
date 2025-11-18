// ChatGPT Citation Scraper - Cloud Server
// Compatible with Render.com, Railway.app, Fly.io

const express = require('express');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Enable CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    message: 'ChatGPT Citation Scraper API',
    version: '1.0.0',
    endpoints: {
      health: '/',
      scrape: '/scrape?url=https://chatgpt.com/share/xxxxx'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Debug endpoint - returns raw HTML for troubleshooting
app.get('/debug', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ 
      error: 'Missing URL parameter',
      usage: '/debug?url=https://chatgpt.com/share/xxxxx'
    });
  }

  let browser = null;
  
  try {
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // Get page content and link info
    const debugInfo = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a[href]'));
      const externalLinks = allLinks
        .filter(l => l.href.startsWith('http') && 
                     !l.href.includes('chatgpt.com') && 
                     !l.href.includes('openai.com'))
        .map((l, i) => ({
          index: i,
          href: l.href,
          text: l.textContent.trim(),
          html: l.outerHTML
        }));
      
      return {
        totalLinks: allLinks.length,
        externalLinks: externalLinks.length,
        links: externalLinks,
        title: document.title,
        bodyLength: document.body.innerHTML.length
      };
    });

    await browser.close();
    
    return res.json({
      success: true,
      ...debugInfo
    });

  } catch (error) {
    if (browser) await browser.close();
    return res.status(500).json({ 
      error: error.message 
    });
  }
});

// Scrape endpoint
app.get('/scrape', async (req, res) => {
  const { url, token } = req.query;
  
  console.log(`[${new Date().toISOString()}] Request received`);
  
  if (!url) {
    return res.status(400).json({ 
      error: 'Missing URL parameter',
      usage: '/scrape?url=https://chatgpt.com/share/xxxxx&token=YOUR_SESSION_TOKEN'
    });
  }

  // Validate it's a ChatGPT URL (accepts both /share/ and /c/ formats)
  if (!url.match(/https:\/\/(chatgpt|chat\.openai)\.com\/(share|c)\/[A-Za-z0-9\-]+/)) {
    return res.status(400).json({ 
      error: 'Invalid ChatGPT URL (must be /share/ or /c/ format)',
      received: url
    });
  }

  console.log(`[${new Date().toISOString()}] Scraping: ${url}`);
  let browser = null;
  
  try {
    // Launch browser with settings optimized for serverless
    browser = await chromium.launch({ 
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080'
      ]
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    // Add authentication cookies if token provided
    if (token) {
      await context.addCookies([
        {
          name: '__Secure-next-auth.session-token',
          value: token,
          domain: '.chatgpt.com',
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'Lax'
        }
      ]);
      console.log(`[${new Date().toISOString()}] Using authenticated session`);
    }
    
    const page = await context.newPage();
    
    console.log(`[${new Date().toISOString()}] Navigating to page...`);
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Wait for content to render
    await page.waitForTimeout(3000);

    console.log(`[${new Date().toISOString()}] Extracting citations...`);
    const citations = await page.evaluate(() => {
      const citationData = [];
      const seenUrls = new Set();
      
      // Find ALL links on the page
      const allLinks = document.querySelectorAll('a[href]');
      console.log(`Total links found: ${allLinks.length}`);
      
      allLinks.forEach((link, index) => {
        const href = link.href;
        const text = link.textContent.trim();
        
        // Only process HTTP/HTTPS links
        if (!href.startsWith('http')) {
          return;
        }
        
        // Skip ChatGPT's own links and common non-citation domains
        if (href.includes('chatgpt.com') || 
            href.includes('openai.com') ||
            href.includes('github.com/openai') ||
            href.includes('help.openai.com')) {
          return;
        }
        
        // Skip duplicates
        if (seenUrls.has(href)) {
          return;
        }
        seenUrls.add(href);
        
        // Get more context to understand the link
        const parent = link.parentElement;
        const parentClass = parent?.className || '';
        const linkClass = link.className || '';
        
        // Try to find citation number from text
        const citationMatch = text.match(/\[?(\d+)\]?/);
        
        citationData.push({
          number: citationMatch ? parseInt(citationMatch[1]) : null,
          url: href,
          text: text || 'Link',
          classes: `link:${linkClass} parent:${parentClass}`,
          position: index
        });
      });

      console.log(`External links found: ${citationData.length}`);
      
      // Return all external links in order they appear
      return citationData;
    });

    await browser.close();
    console.log(`[${new Date().toISOString()}] Success! Found ${citations.length} citations`);

    return res.status(200).json({
      success: true,
      url: url,
      citations: citations,
      count: citations.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    if (browser) {
      await browser.close();
    }
    
    console.error(`[${new Date().toISOString()}] Error:`, error.message);
    return res.status(500).json({ 
      error: 'Failed to scrape citations',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  ChatGPT Citation Scraper API                              ║
║  Port: ${PORT}                                              ║
║  Environment: ${process.env.NODE_ENV || 'development'}     ║
║  Ready to accept requests ✅                               ║
╚════════════════════════════════════════════════════════════╝
  `);
});
