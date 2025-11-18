// --- Import ChatGPT Shared Conversation → Clean Markdown with Citations ---
// This version fetches citation URLs from your cloud scraper API
(() => {
    // ===== CONFIGURATION =====
    // Replace with your deployed scraper URL:
    const SCRAPER_API = "https://drafts-chatgpt-importer.onrender.com"; // or .railway.app or .fly.dev
    const ENABLE_CITATIONS = true; // Set to false to skip citation scraping
    // =========================

    const d = draft;
    const cleaned = d.content.trim();

    // Accept any valid ChatGPT URL (/share/ or /c/)
    const shareRegex = /(https:\/\/(chatgpt|chat\.openai)\.com\/(share|c)\/[A-Za-z0-9\-]+)/;
    const match = cleaned.match(shareRegex);

    if (!match) {
        app.displayErrorMessage("This draft must contain a ChatGPT link (share or conversation URL).");
        return;
    }

    const originalURL = match[1];
    const shareID = originalURL.split("/").pop().split(/[?#]/)[0];
    
    // Convert /c/ URLs to /share/ format for API access
    const shareURL = originalURL.includes('/c/') 
        ? originalURL.replace('/c/', '/share/')
        : originalURL;
    
    const apiURL = `https://chatgpt.com/backend-api/share/${shareID}`;

    // Fetch JSON from ChatGPT API
    const http = HTTP.create();
    const response = http.request({ url: apiURL, method: "GET" });

    if (!response.success) {
        app.displayErrorMessage("Failed to fetch conversation.");
        return;
    }

    let json;
    try {
        json = JSON.parse(response.responseText);
    } catch {
        app.displayErrorMessage("Invalid JSON returned.");
        return;
    }

    const title = json.title || "ChatGPT Conversation";
    const mapping = json.mapping;
    if (!mapping) {
        app.displayErrorMessage("No mapping found in the share JSON.");
        return;
    }

    // Try to fetch citations from scraper API
    let citations = [];
    let citationDebug = "Citations: disabled";
    
    if (ENABLE_CITATIONS && SCRAPER_API !== "https://YOUR-APP-NAME.onrender.com") {
        console.log("Fetching citations from scraper...");
        citationDebug = "Citations: fetching...";
        
        const citationHttp = HTTP.create();
        // Use originalURL so scraper sees the actual page format
        const citationResponse = citationHttp.request({
            url: `${SCRAPER_API}/scrape?url=${encodeURIComponent(originalURL)}`,
            method: "GET",
            timeout: 60 // Wait up to 60 seconds for free tier spin-up
        });

        if (citationResponse.success) {
            try {
                const citationData = JSON.parse(citationResponse.responseText);
                console.log("Citation API response:", JSON.stringify(citationData));
                
                if (citationData.success && citationData.citations) {
                    citations = citationData.citations;
                    citationDebug = `Citations: found ${citations.length}`;
                    console.log(`✓ Found ${citations.length} citations`);
                } else {
                    citationDebug = "Citations: none found in page";
                    console.log("No citations in API response");
                }
            } catch (e) {
                citationDebug = `Citations: parse error - ${e}`;
                console.log("Could not parse citation data:", e);
            }
        } else {
            citationDebug = `Citations: API failed (${citationResponse.statusCode || 'unknown error'})`;
            console.log("Citation scraper request failed:", citationResponse.error || citationResponse.statusCode);
        }
    }

    // Create citation lookup map
    const citationMap = new Map();
    citations.forEach((cite, index) => {
        if (cite.number) {
            citationMap.set(cite.number, cite.url);
        } else {
            citationMap.set(index + 1, cite.url);
        }
    });

    // ------------------------------------------------------------
    // CLEANING HELPERS
    // ------------------------------------------------------------

    function cleanUrl(url) {
        if (!url) return url;
        // Remove utm_source and other utm parameters
        let cleanedUrl = url.replace(/[?&]utm_source=[^&]*/g, '');
        cleanedUrl = cleanedUrl.replace(/[?&]utm_[^&]*/g, '');
        cleanedUrl = cleanedUrl.replace(/[?&]$/, '');
        return cleanedUrl;
    }

    function cleanText(text) {
        if (!text) return "";

        // 1. Remove entity annotations (handles unicode quotes)
        let entityIndex;
        while ((entityIndex = text.indexOf('entity[')) !== -1) {
            let endIndex = entityIndex + 7;
            let bracketDepth = 1;
            let inQuote = false;
            let quoteChar = null;
            
            while (endIndex < text.length && bracketDepth > 0) {
                const char = text[endIndex];
                
                // Handle any quote character (ASCII or unicode)
                if ('"""\'\'\`'.includes(char)) {
                    if (!inQuote) {
                        inQuote = true;
                        quoteChar = char;
                    } else if (char === quoteChar || 
                              (quoteChar === '"' && '""'.includes(char)) || 
                              ('""'.includes(quoteChar) && char === '"')) {
                        inQuote = false;
                        quoteChar = null;
                    }
                } else if (!inQuote) {
                    if (char === '[') {
                        bracketDepth++;
                    } else if (char === ']') {
                        bracketDepth--;
                        if (bracketDepth === 0) {
                            endIndex++;
                            break;
                        }
                    } else if (char === ' ') {
                        const segment = text.substring(entityIndex + 7, endIndex);
                        if (/,\d+/.test(segment)) {
                            break;
                        }
                    }
                }
                endIndex++;
            }
            
            text = text.substring(0, entityIndex) + text.substring(endIndex);
        }

        // 2. Replace citation tags with [Cite](URL) markdown links
        // Patterns like: citeturn0search4turn0search21, citeturn0news27, cite1, etc.
        
        // First, try to match citation tags with URLs from the citations array
        // Since citation tags don't have clear numbers, we'll replace them sequentially
        let citationIndex = 0;
        
        // Match cite followed by any combination of alphanumeric (handles all variations)
        text = text.replace(/cite(?:turn\d+)?(?:search\d+)?(?:turn\d+)?(?:search\d+)?(?:news\d+)?(?:[a-z]+\d+)*/gi, (match) => {
            // If we have a citation URL available, use it
            if (citationIndex < citations.length && citations[citationIndex]) {
                const url = citations[citationIndex].url;
                citationIndex++;
                return `[Cite](${url})`;
            }
            // No URL available - replace with placeholder
            citationIndex++;
            return '[Cite]';
        });
        
        // Fallback: catch any remaining cite+alphanumeric that we missed
        text = text.replace(/\bcite[a-z0-9]+/gi, '[Cite]');
        
        // Handle HTML cite tags
        text = text.replace(/<cite[^>]*>([^<]*)<\/cite>/g, '[Cite]');
        
        // Clean up any double spaces left from replacement
        text = text.replace(/\s{2,}/g, ' ');

        // 3. Find raw URLs and convert to markdown
        const urlRegex = /(https?:\/\/[^\s)]+)/g;
        let urls = text.match(urlRegex) || [];

        urls.forEach(url => {
            if (text.includes(`](${url})`)) return;
            
            const cleanedUrl = cleanUrl(url);
            const markdown = `[Link](${cleanedUrl})`;
            text = text.replace(url, markdown);
        });

        return text.trim();
    }

    // ------------------------------------------------------------
    // BUILD ORDERED MESSAGE LIST
    // ------------------------------------------------------------

    let rootId = Object.keys(mapping).find(k => mapping[k].parent === null);
    if (!rootId) rootId = Object.keys(mapping)[0];

    let ordered = [];

    function walk(nodeId) {
        const node = mapping[nodeId];
        if (!node) return;

        const msg = node.message;

        if (
            msg &&
            msg.author &&
            (msg.author.role === "assistant" || msg.author.role === "user") &&
            msg.content &&
            Array.isArray(msg.content.parts)
        ) {
            let text = msg.content.parts.join("\n\n").trim();
            text = cleanText(text);

            if (text.length > 0) {
                ordered.push({
                    role: msg.author.role,
                    text: text
                });
            }
        }

        (node.children || []).forEach(child => walk(child));
    }

    walk(rootId);

    // ------------------------------------------------------------
    // FORMAT MARKDOWN OUTPUT
    // ------------------------------------------------------------

    let content = '';
    ordered.forEach(msg => {
        const who = msg.role === "user" ? "User" : "ChatGPT";
        content += `### **${who}**\n${msg.text}\n\n---\n\n`;
    });
    
    // Final cleanup pass
    function finalCleanup(str) {
        // Remove any remaining entity annotations with unicode quotes
        str = str.replace(/entity\[["'""][^"'""]*["'""],["'""][^"'""]*["'""],\d+/g, '');
        str = str.replace(/entity\[[^\]]*\d+\]?/g, '');
        str = str.replace(/entity\[[^\]]*\]/g, '');
        
        // Clean up whitespace
        str = str.replace(/ {2,}/g, ' ');
        str = str.replace(/ +([.,!?;:])/g, '$1');
        str = str.replace(/ +$/gm, '');
        
        return str;
    }
    
    content = finalCleanup(content);
    
    // Build final output with citations section if available
    let out = `# ${title}\n\n`;
    out += `**[Source](${shareURL}):** ${shareURL}\n\n`;
    
    // Add debug info about citations
    if (ENABLE_CITATIONS) {
        out += `<!-- ${citationDebug} -->\n\n`;
    }
    
    if (citations.length > 0) {
        out += `## Citations\n\n`;
        citations.forEach((cite, index) => {
            const num = cite.number || (index + 1);
            out += `${num}. [${cite.text || 'Link'}](${cite.url})\n`;
        });
        out += `\n---\n\n`;
    }
    
    out += content;

    // ------------------------------------------------------------
    // CREATE NEW DRAFT
    // ------------------------------------------------------------

    const nd = Draft.create();
    nd.content = out;
    nd.addTag("chatgpt");
    nd.addTag("imported");
    if (citations.length > 0) {
        nd.addTag("citations");
    }
    nd.update();

    editor.load(nd);
    editor.activate();

    const citationMsg = citations.length > 0 
        ? ` with ${citations.length} citations` 
        : (ENABLE_CITATIONS ? ' (no citations found)' : '');
    app.displaySuccessMessage(`Conversation imported${citationMsg} ✔︎\n${citationDebug}`);
})();
