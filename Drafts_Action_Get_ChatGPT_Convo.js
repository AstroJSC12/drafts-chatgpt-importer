// --- Import ChatGPT Shared Conversation → Clean Markdown with Citations ---
(() => {
    const d = draft;
    const cleaned = d.content.trim();

    // Accept any valid ChatGPT share URL
    const shareRegex = /(https:\/\/(chatgpt|chat\.openai)\.com\/(share|c)\/[A-Za-z0-9\-]+)/;
    const match = cleaned.match(shareRegex);

    if (!match) {
        app.displayErrorMessage("This draft must contain a ChatGPT share link.");
        return;
    }

    const shareURL = match[1];
    const shareID = shareURL.split("/").pop().split(/[?#]/)[0];
    const apiURL = `https://chatgpt.com/backend-api/share/${shareID}`;

    // Fetch JSON
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

    // ------------------------------------------------------------
    // CLEANING HELPERS
    // ------------------------------------------------------------

    function cleanUrl(url) {
        if (!url) return url;
        // Remove utm_source and other utm parameters
        let cleanedUrl = url.replace(/[?&]utm_source=[^&]*/g, '');
        cleanedUrl = cleanedUrl.replace(/[?&]utm_[^&]*/g, '');
        // Clean up any trailing ? or & characters
        cleanedUrl = cleanedUrl.replace(/[?&]$/, '');
        return cleanedUrl;
    }

    function cleanText(text) {
        if (!text) return "";

        // 1. Remove entity annotations
        // Manual approach: find entity[ and remove everything until we've passed the number and optional ]
        let entityIndex;
        while ((entityIndex = text.indexOf('entity[')) !== -1) {
            let endIndex = entityIndex + 7; // Start after 'entity['
            let bracketDepth = 1;
            let inQuote = false;
            let quoteChar = null;
            
            // Scan forward to find the end of the entity annotation
            while (endIndex < text.length && bracketDepth > 0) {
                const char = text[endIndex];
                
                // Handle any quote character (ASCII or unicode)
                if ('"""\'\'\`'.includes(char)) {
                    if (!inQuote) {
                        inQuote = true;
                        quoteChar = char;
                    } else if (char === quoteChar || (quoteChar === '"' && '""'.includes(char)) || ('""'.includes(quoteChar) && char === '"')) {
                        inQuote = false;
                        quoteChar = null;
                    }
                } else if (!inQuote) {
                    if (char === '[') {
                        bracketDepth++;
                    } else if (char === ']') {
                        bracketDepth--;
                        if (bracketDepth === 0) {
                            endIndex++; // Include the closing bracket
                            break;
                        }
                    } else if (char === ' ') {
                        // Hit a space outside quotes - check if we've seen the number pattern
                        const segment = text.substring(entityIndex + 7, endIndex);
                        if (/,\d+/.test(segment)) {
                            // We've seen the number, stop here (unclosed entity tag)
                            break;
                        }
                    }
                }
                endIndex++;
            }
            
            const removed = text.substring(entityIndex, endIndex);
            debugLog.push(`Removed entity: "${removed}"`);
            
            // Remove the entity annotation
            text = text.substring(0, entityIndex) + text.substring(endIndex);
        }

        // 2. Remove citation tags
        text = text.replace(/cite(turn\d+\w+\d+)/g, '');
        text = text.replace(/<cite[^>]*>([^<]*)<\/cite>/g, '');
        text = text.replace(/]+/g, "");
        text = text.replace(/cite\w+/g, '');

        // 3. Find all raw URLs in the text and convert to markdown
        const urlRegex = /(https?:\/\/[^\s)]+)/g;
        let urls = text.match(urlRegex) || [];

        urls.forEach(url => {
            // Skip if already part of a markdown link
            if (text.includes(`](${url})`)) return;
            
            const cleanedUrl = cleanUrl(url);
            const markdown = `[Citation](${cleanedUrl})`;
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

        // walk children
        (node.children || []).forEach(child => walk(child));
    }

    walk(rootId);

    // ------------------------------------------------------------
    // FORMAT MARKDOWN OUTPUT
    // ------------------------------------------------------------

    // Build the content
    let content = '';
    ordered.forEach(msg => {
        const who = msg.role === "user" ? "User" : "ChatGPT";
        content += `### **${who}**\n${msg.text}\n\n---\n\n`;
    });
    
    // AGGRESSIVE FINAL CLEANUP: Remove ALL entity and citation annotations
    // This runs on the complete assembled output
    function finalCleanup(str) {
        // Remove entity annotations with all variations
        str = str.replace(/entity\["[^"]*","[^"]*",\d+/g, ''); // entity["type","name",0
        str = str.replace(/entity\[[^\]]*\d+\]?/g, '');
        str = str.replace(/entity\[[^\]]*\]/g, '');
        
        // Remove citation patterns - all variations
        str = str.replace(/cite(turn\d+[a-z]+\d+)/gi, '');
        str = str.replace(/cite(turn\d+[a-z0-9]+)/gi, '');
        str = str.replace(/<cite[^>]*>([^<]*)<\/cite>/g, '');
        str = str.replace(/]+/g, '');
        
        // Clean up HORIZONTAL whitespace only (not newlines)
        str = str.replace(/ {2,}/g, ' '); // multiple spaces to single space
        str = str.replace(/ +([.,!?;:])/g, '$1'); // space before punctuation
        str = str.replace(/ +$/gm, ''); // trailing spaces at end of lines
        
        return str;
    }
    
    content = finalCleanup(content);
    
    // Build final output
    let out = `# ${title}\n\n`;
    out += `**[Source](${shareURL}):** ${shareURL}\n\n---\n\n`;
    out += content;

    // ------------------------------------------------------------
    // CREATE NEW DRAFT
    // ------------------------------------------------------------

    const nd = Draft.create();
    nd.content = out;
    nd.addTag("chatgpt");
    nd.addTag("imported");
    nd.update();

    editor.load(nd);
    editor.activate();

    app.displaySuccessMessage("Conversation imported ✔︎");
})();