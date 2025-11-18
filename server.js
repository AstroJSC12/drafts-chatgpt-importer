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
      scrape: '/scrape?url=https://chatgpt.com/share/xxxxx&token=YOUR_SESSION_TOKEN',
      debug: '/debug?url=https://chatgpt.com/share/xxxxx&token=YOUR_SESSION_TOKEN'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Raw HTML endpoint - returns actual page HTML for analysis
app.get('/html', async (req, res) => {
  const { url, token } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'Missing URL parameter' });
  }
  
  let browser = null;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    
    // Add auth if provided
    if (token) {
      await context.addCookies([{
        name: '__Secure-next-auth.session-token',
        value: token,
        domain: '.chatgpt.com',
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Lax'
      }]);
    }
    
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    const html = await page.content();
    await browser.close();
    
    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    if (browser) await browser.close();
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint - returns raw HTML for troubleshooting
app.get('/debug', async (req, res) => {
  const { url, token } = req.query;
  
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
      console.log('Debug: Using authenticated session');
    }
    
    const page = await context.newPage();
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);
    
    // Wait for citation links
    try {
      await page.waitForSelector('a[href*="utm_source=chatgpt.com"]', { timeout: 5000 });
    } catch (e) {
      console.log('Debug: No utm_source links found');
    }
    
    // Get page content and link info
    const debugInfo = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a[href]'));
      
      // Look for citation links with utm_source
      const citationLinks = Array.from(document.querySelectorAll('a[href*="utm_source=chatgpt.com"]'));
      
      const externalLinks = allLinks
        .filter(l => l.href.startsWith('http') && 
                     !l.href.includes('chatgpt.com/') && 
                     !l.href.includes('openai.com'))
        .map((l, i) => ({
          index: i,
          href: l.href,
          text: l.textContent.trim(),
          hasCitationMarker: l.href.includes('utm_source=chatgpt.com')
        }));
      
      return {
        totalLinks: allLinks.length,
        citationLinksWithUtmSource: citationLinks.length,
        externalLinks: externalLinks.length,
        citationLinks: citationLinks.map(l => ({
          href: l.href,
          text: l.textContent.trim()
        })),
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

    // Wait for content to render - increased timeout for citation links
    await page.waitForTimeout(5000);
    
    // Wait for citation links to be present
    try {
      await page.waitForSelector('a[href*="utm_source=chatgpt.com"]', { timeout: 5000 });
      console.log('Citation links detected');
    } catch (e) {
      console.log('No citation links found with utm_source');
    }

    console.log(`[${new Date().toISOString()}] Extracting citations...`);
    const citations = await page.evaluate(() => {
      const citationData = [];
      const seenUrls = new Set();
      
      // FIRST: Try to find citation data in Next.js data or window objects
      try {
        // Look for __NEXT_DATA__ which Next.js apps use
        const nextDataScript = document.getElementById('__NEXT_DATA__');
        if (nextDataScript) {
          const nextData = JSON.parse(nextDataScript.textContent);
          console.log('Found Next.js data:', Object.keys(nextData));
          
          // Try to find citation metadata in the page props
          const pageProps = nextData?.props?.pageProps;
          if (pageProps) {
            console.log('PageProps keys:', Object.keys(pageProps));
            
            // Look for citation metadata or retrieval results
            if (pageProps.serverResponse?.data?.retrieval_results) {
              const results = pageProps.serverResponse.data.retrieval_results;
              results.forEach((result, idx) => {
                if (result.metadata?.url) {
                  citationData.push({
                    number: idx + 1,
                    url: result.metadata.url,
                    text: result.metadata.title || `Citation ${idx + 1}`,
                    source: 'next_data'
                  });
                  seenUrls.add(result.metadata.url);
                }
              });
            }
          }
        }
      } catch (e) {
        console.log('Error parsing Next.js data:', e.message);
      }
      
      // Try to find citation elements by common patterns
      const citationElements = document.querySelectorAll('[data-citation], .citation, [class*="citation"]');
      console.log(`Found ${citationElements.length} potential citation elements`);
      citationElements.forEach((el) => {
        const url = el.getAttribute('data-url') || el.getAttribute('href') || el.getAttribute('data-href');
        if (url && url.startsWith('http') && !seenUrls.has(url)) {
          citationData.push({
            number: null,
            url: url,
            text: el.textContent?.trim() || 'Citation',
            source: 'data_attribute'
          });
          seenUrls.add(url);
        }
      });
      
      // BEST APPROACH: Find citation links by ChatGPT's utm_source marker
      const citationLinks = document.querySelectorAll('a[href*="utm_source=chatgpt.com"]');
      console.log(`Found ${citationLinks.length} links with utm_source=chatgpt.com`);
      
      citationLinks.forEach((link, index) => {
        const href = link.href;
        const text = link.textContent.trim();
        
        // Skip duplicates
        if (seenUrls.has(href)) {
          return;
        }
        seenUrls.add(href);
        
        citationData.push({
          number: index + 1,
          url: href,
          text: text || 'Citation',
          source: 'utm_marker'
        });
      });
      
      // FALLBACK: Find ALL external links if no utm_source links found
      if (citationData.length === 0) {
        const allLinks = document.querySelectorAll('a[href]');
        console.log(`Fallback: Total links found: ${allLinks.length}`);
        
        allLinks.forEach((link, index) => {
          const href = link.href;
          const text = link.textContent.trim();
          
          // Only process HTTP/HTTPS links
          if (!href.startsWith('http')) {
            return;
          }
          
          // Skip ChatGPT's own links (but not links WITH chatgpt.com as utm_source)
          if (href.includes('chatgpt.com/') || 
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
            position: index,
            source: 'external_link'
          });
        });
      }

      console.log(`Total citations found: ${citationData.length}`);
      
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
