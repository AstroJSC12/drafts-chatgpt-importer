# TODO & Future Improvements

## Security (HIGH PRIORITY)
- [ ] **Add API authentication** - Prevent unauthorized access to the scraper API
  - Options:
    - API key authentication (pass key in header or query param)
    - Vercel environment variables for allowed origins
    - Rate limiting to prevent abuse
- [ ] **Encrypt sensitive data** - Ensure conversation URLs are not logged or exposed
- [ ] **HTTPS only** - Verify all communication is encrypted
- [ ] **Input validation** - Sanitize and validate all ChatGPT URLs before scraping
- [ ] **Consider private deployment** - Use Vercel's team/pro features for private functions
- [ ] **No logging of URLs** - Ensure conversation URLs are never stored in logs

## Features
- [ ] Better citation extraction - improve accuracy of finding citation URLs
- [ ] Handle pagination/long conversations
- [ ] Extract image references and descriptions
- [ ] Support for other ChatGPT share formats
- [ ] Caching layer to avoid re-scraping same URLs (with privacy controls)
- [ ] Fix unicode quote handling in entity annotations

## Code Quality
- [ ] Add error handling and retry logic
- [ ] Add logging for debugging (without exposing sensitive data)
- [ ] Unit tests for citation parsing
- [ ] Documentation for API endpoints

## Performance
- [ ] Optimize browser launch time
- [ ] Consider using lighter headless browser
- [ ] Add timeout controls
- [ ] Reduce cold start times on Vercel

## Deployment
- [ ] Set up staging environment
- [ ] Add CI/CD pipeline
- [ ] Monitor API usage and errors
- [ ] Set up alerts for failures
- [ ] Configure proper CORS for production

## Current Issues
- [ ] Entity annotations with unicode quotes not being removed
- [ ] Citation tags still appearing in output despite cleanup attempts
- [x] **Browser automation on Vercel serverless doesn't work** - Tried Puppeteer, @sparticuz/chromium, and Playwright
  - Issue: Missing system libraries (libnss3.so) and browser binaries in serverless environment
  - Vercel's free tier has limitations for running headless browsers

## Alternative Approaches for Citation Scraping
1. **Use a paid browser automation service**
   - Browserless.io ($20/month) - managed browser instances
   - ScrapingBee (pay-per-request) - simpler API
   - Pros: Works reliably, no infrastructure management
   - Cons: Monthly cost

2. **Deploy to container-based platform**
   - Railway or Render with Docker
   - Can install all necessary system libraries
   - Pros: Full control, still affordable
   - Cons: Slightly more complex setup

3. **Different parsing approach**
   - Check if ChatGPT API provides citation data (unlikely based on research)
   - Parse the static HTML differently without JavaScript rendering
   - Use regex/text parsing on API response instead of rendered page

4. **Accept limitation for now**
   - Focus on cleaning up entity/citation tags from API response
   - Document that citation URLs are not available via this method
   - Users can manually add citations if needed
