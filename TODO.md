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
