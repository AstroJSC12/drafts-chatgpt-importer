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
    browser = await chromium.launch({ 
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });
    
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
    
    // Hide automation markers
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      window.chrome = { runtime: {} };
    });
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(8000);
    
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
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US'
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
      console.log('Debug: Using authenticated session');
    }
    
    const page = await context.newPage();
    
    // Hide automation markers
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      window.chrome = { runtime: {} };
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    });
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(8000);
    
    // Wait for citation links
    try {
      await page.waitForSelector('a[href*="utm_source=chatgpt.com"]', { timeout: 10000 });
      console.log('Debug: Citation links found');
    } catch (e) {
      console.log('Debug: No utm_source links found after waiting');
    }
    
    // Get page content and link info
    const debugInfo = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a[href]'));
      
      // Check each link's URL to see if it has utm_source parameter
      const citationLinks = [];
      const externalLinks = [];
      
      allLinks.forEach((link, i) => {
        try {
          const url = new URL(link.href);
          const isExternal = !url.hostname.includes('chatgpt.com') && 
                           !url.hostname.includes('openai.com');
          
          if (isExternal && url.protocol.startsWith('http')) {
            const linkData = {
              index: i,
              href: link.href,
              text: link.textContent.trim(),
              hostname: url.hostname,
              hasCitationMarker: url.searchParams.get('utm_source') === 'chatgpt.com'
            };
            
            externalLinks.push(linkData);
            
            if (url.searchParams.get('utm_source') === 'chatgpt.com') {
              citationLinks.push({
                href: link.href,
                text: link.textContent.trim()
              });
            }
          }
        } catch (e) {
          // Skip invalid URLs
        }
      });
      
      return {
        totalLinks: allLinks.length,
        citationLinksWithUtmSource: citationLinks.length,
        externalLinks: externalLinks.length,
        citationLinks: citationLinks,
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
        '--disable-blink-features=AutomationControlled',
        '--disable-gpu',
        '--window-size=1920x1080',
        '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
      hasTouch: false,
      isMobile: false,
      deviceScaleFactor: 1
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
    
    // Hide webdriver and automation properties
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      window.chrome = { runtime: {} };
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });
    
    console.log(`[${new Date().toISOString()}] Navigating to page...`);
    
    // Use domcontentloaded instead of networkidle - more reliable
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });

    console.log(`[${new Date().toISOString()}] Page loaded, waiting for content...`);
    
    // Wait longer for React/Next.js to render citation links
    await page.waitForTimeout(8000);
    
    // Wait for citation links to be present
    try {
      await page.waitForSelector('a[href*="utm_source=chatgpt.com"]', { timeout: 10000 });
      console.log('Citation links detected!');
    } catch (e) {
      console.log('Warning: No citation links found with utm_source after waiting');
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
      // Check all links and parse their URLs properly
      const allLinkElements = document.querySelectorAll('a[href]');
      let citationCount = 0;
      
      allLinkElements.forEach((link) => {
        try {
          const url = new URL(link.href);
          
          // Check if this is an external link with utm_source=chatgpt.com
          const isExternal = !url.hostname.includes('chatgpt.com') && 
                           !url.hostname.includes('openai.com');
          const hasCitationMarker = url.searchParams.get('utm_source') === 'chatgpt.com';
          
          if (isExternal && hasCitationMarker) {
            citationCount++;
            const href = link.href;
            const text = link.textContent.trim();
            
            // Skip duplicates
            if (seenUrls.has(href)) {
              return;
            }
            seenUrls.add(href);
            
            citationData.push({
              number: citationCount,
              url: href,
              text: text || 'Citation',
              source: 'utm_marker'
            });
          }
        } catch (e) {
          // Skip invalid URLs
        }
      });
      
      console.log(`Found ${citationCount} links with utm_source=chatgpt.com`);
      
      // FALLBACK: Find ALL external links if no utm_source links found
      if (citationData.length === 0) {
        console.log(`Fallback: Looking for any external links...`);
        
        allLinkElements.forEach((link, index) => {
          try {
            const url = new URL(link.href);
            const href = link.href;
            const text = link.textContent.trim();
            
            // Only process HTTP/HTTPS links
            if (!url.protocol.startsWith('http')) {
              return;
            }
            
            // Skip ChatGPT's own links
            if (url.hostname.includes('chatgpt.com') || 
                url.hostname.includes('openai.com')) {
              return;
            }
            
            // Skip duplicates
            if (seenUrls.has(href)) {
              return;
            }
            seenUrls.add(href);
            
            citationData.push({
              number: index + 1,
              url: href,
              text: text || 'Citation',
              source: 'fallback'
            });
          } catch (e) {
            // Skip invalid URLs
          }
        });
        console.log(`Fallback: Found ${citationData.length} external links`);
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
