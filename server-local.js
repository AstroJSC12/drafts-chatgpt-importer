// Local Citation Scraper Server
// Run with: node server-local.js
// Then access at: http://localhost:3000/scrape?url=https://chatgpt.com/share/xxxxx

const express = require('express');
const { chromium } = require('playwright');

const app = express();
const PORT = 3000;

app.use(express.json());

// Enable CORS for local Drafts access
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
    message: 'ChatGPT Citation Scraper - Local Server',
    usage: '/scrape?url=https://chatgpt.com/share/xxxxx'
  });
});

// Scrape endpoint
app.get('/scrape', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ 
      error: 'Missing URL parameter',
      usage: '/scrape?url=https://chatgpt.com/share/xxxxx'
    });
  }

  // Validate it's a ChatGPT share URL
  if (!url.match(/https:\/\/(chatgpt|chat\.openai)\.com\/(share|c)\/[A-Za-z0-9\-]+/)) {
    return res.status(400).json({ 
      error: 'Invalid ChatGPT share URL' 
    });
  }

  console.log(`📥 Scraping: ${url}`);
  let browser = null;
  
  try {
    // Launch browser
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    
    // Navigate to the share page
    console.log('⏳ Loading page...');
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Wait for content to render
    await page.waitForTimeout(2000);

    // Extract citations from the rendered HTML
    console.log('🔍 Extracting citations...');
    const citations = await page.evaluate(() => {
      const citationData = [];
      
      // Method 1: Look for citation number elements with links
      // ChatGPT shows citations as [1], [2], etc. with clickable links
      const citationLinks = document.querySelectorAll('a[href^="http"]');
      
      citationLinks.forEach((link) => {
        const href = link.href;
        const text = link.textContent.trim();
        
        // Skip ChatGPT's own links
        if (href.includes('chatgpt.com') || href.includes('openai.com')) {
          return;
        }
        
        // Look for citation number pattern (e.g., "[1]", "1", etc.)
        const citationNumber = text.match(/\[?(\d+)\]?/);
        
        citationData.push({
          number: citationNumber ? parseInt(citationNumber[1]) : null,
          url: href,
          text: text,
          // Get surrounding context
          context: link.closest('div')?.textContent?.substring(0, 150) || ''
        });
      });

      // Method 2: Look for specific citation markup
      const citationMarkers = document.querySelectorAll('[class*="citation"], [data-cite]');
      citationMarkers.forEach((marker) => {
        const link = marker.querySelector('a') || marker;
        if (link.href && !link.href.includes('chatgpt.com')) {
          citationData.push({
            url: link.href,
            text: link.textContent.trim(),
            type: 'marker'
          });
        }
      });

      return citationData;
    });

    await browser.close();
    console.log(`✅ Found ${citations.length} citations`);

    return res.status(200).json({
      success: true,
      url: url,
      citations: citations,
      count: citations.length
    });

  } catch (error) {
    if (browser) {
      await browser.close();
    }
    
    console.error('❌ Scraping error:', error.message);
    return res.status(500).json({ 
      error: 'Failed to scrape citations',
      message: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  ChatGPT Citation Scraper - Local Server                  ║
║  Running on http://localhost:${PORT}                        ║
║                                                            ║
║  Usage: http://localhost:${PORT}/scrape?url=SHARE_URL       ║
║                                                            ║
║  Status: Ready ✅                                          ║
╚════════════════════════════════════════════════════════════╝
  `);
});
