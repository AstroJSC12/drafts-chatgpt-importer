const playwright = require('playwright-aws-lambda');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ 
      error: 'Missing URL parameter',
      usage: '/api/scrape?url=https://chatgpt.com/share/xxxxx'
    });
  }

  // Validate it's a ChatGPT share URL
  if (!url.match(/https:\/\/(chatgpt|chat\.openai)\.com\/(share|c)\/[A-Za-z0-9\-]+/)) {
    return res.status(400).json({ 
      error: 'Invalid ChatGPT share URL' 
    });
  }

  let browser = null;
  
  try {
    // Launch browser with Playwright
    browser = await playwright.launchChromium();
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    
    // Navigate to the share page
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Wait for content to load
    await page.waitForTimeout(3000);

    // Extract citations from the page
    const citations = await page.evaluate(() => {
      const citationData = [];
      
      // Look for citation links in the rendered content
      // ChatGPT citations often appear as superscript links or reference markers
      const citationElements = document.querySelectorAll('a[href*="http"]');
      
      citationElements.forEach((element, index) => {
        const href = element.href;
        const text = element.textContent.trim();
        
        // Try to identify citation patterns
        // Look for elements that might be citations
        if (href && !href.includes('chatgpt.com') && !href.includes('openai.com')) {
          citationData.push({
            index: index,
            url: href,
            text: text,
            context: element.parentElement?.textContent?.substring(0, 200)
          });
        }
      });

      // Also try to find any data attributes or special citation markers
      const specialCitations = document.querySelectorAll('[data-cite], [class*="citation"], [class*="reference"]');
      specialCitations.forEach((element) => {
        const link = element.querySelector('a');
        if (link) {
          citationData.push({
            url: link.href,
            text: link.textContent.trim(),
            type: 'special'
          });
        }
      });

      return citationData;
    });

    await browser.close();

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
    
    console.error('Scraping error:', error);
    return res.status(500).json({ 
      error: 'Failed to scrape citations',
      message: error.message 
    });
  }
};
