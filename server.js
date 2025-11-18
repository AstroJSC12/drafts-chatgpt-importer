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

// Scrape endpoint
app.get('/scrape', async (req, res) => {
  const { url } = req.query;
  
  console.log(`[${new Date().toISOString()}] Request received`);
  
  if (!url) {
    return res.status(400).json({ 
      error: 'Missing URL parameter',
      usage: '/scrape?url=https://chatgpt.com/share/xxxxx'
    });
  }

  // Validate it's a ChatGPT share URL
  if (!url.match(/https:\/\/(chatgpt|chat\.openai)\.com\/(share|c)\/[A-Za-z0-9\-]+/)) {
    return res.status(400).json({ 
      error: 'Invalid ChatGPT share URL',
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
      
      // Method 1: Find all external links (potential citations)
      const allLinks = document.querySelectorAll('a[href^="http"]');
      
      allLinks.forEach((link, index) => {
        const href = link.href;
        const text = link.textContent.trim();
        
        // Skip ChatGPT's own links
        if (href.includes('chatgpt.com') || href.includes('openai.com')) {
          return;
        }
        
        // Skip duplicates
        if (seenUrls.has(href)) {
          return;
        }
        seenUrls.add(href);
        
        // Try to find citation number
        const citationMatch = text.match(/\[?(\d+)\]?/);
        const parentText = link.parentElement?.textContent || '';
        
        citationData.push({
          number: citationMatch ? parseInt(citationMatch[1]) : index + 1,
          url: href,
          text: text,
          context: parentText.substring(0, 200).trim()
        });
      });

      // Method 2: Look for citation-specific markup
      const citationElements = document.querySelectorAll('[class*="citation"], [class*="reference"], [data-cite], sup a');
      citationElements.forEach((element) => {
        const link = element.tagName === 'A' ? element : element.querySelector('a');
        if (link && link.href && !seenUrls.has(link.href)) {
          if (!link.href.includes('chatgpt.com') && !link.href.includes('openai.com')) {
            seenUrls.add(link.href);
            citationData.push({
              url: link.href,
              text: link.textContent.trim(),
              type: 'citation_element'
            });
          }
        }
      });

      // Sort by citation number if available
      return citationData.sort((a, b) => {
        if (a.number && b.number) return a.number - b.number;
        return 0;
      });
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
