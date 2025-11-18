// Quick test script to see what the scraper returns
// Usage: node test-scraper.js https://chatgpt.com/share/YOUR_ID

const SCRAPER_API = "https://drafts-chatgpt-importer.onrender.com";

const shareURL = process.argv[2];

if (!shareURL) {
    console.error("Usage: node test-scraper.js https://chatgpt.com/share/YOUR_ID");
    process.exit(1);
}

console.log(`Testing scraper with: ${shareURL}\n`);
console.log(`Calling: ${SCRAPER_API}/scrape?url=${shareURL}\n`);

fetch(`${SCRAPER_API}/scrape?url=${encodeURIComponent(shareURL)}`)
    .then(response => response.json())
    .then(data => {
        console.log("=== SCRAPER RESPONSE ===");
        console.log(JSON.stringify(data, null, 2));
        
        if (data.success && data.citations) {
            console.log("\n=== CITATIONS FOUND ===");
            data.citations.forEach((cite, index) => {
                console.log(`\n${index + 1}.`);
                console.log(`   URL: ${cite.url}`);
                console.log(`   Text: ${cite.text}`);
                console.log(`   Number: ${cite.number || 'none'}`);
                if (cite.context) {
                    console.log(`   Context: ${cite.context.substring(0, 100)}...`);
                }
            });
        } else {
            console.log("\nNo citations found or scraper failed");
        }
    })
    .catch(error => {
        console.error("Error:", error.message);
    });
