/**
 * HSI Project - Main Entry Point
 * 
 * Serves an HTML dashboard with real-time HSI data fetched from AASTOCKS.
 * Auto-refreshes data every 30 seconds.
 */

const http = require('http');
const path = require('path');

const PORT = 3000;
const HOST = '0.0.0.0';
const AASTOCKS_URL = 'http://www.aastocks.com';

// Global variable to store latest data
let latestHsiData = {
    price: '---',
    change: 0,
    changePercent: 0,
    timestamp: 'Loading...',
    source: 'AASTOCKS (Live)',
    status: 'fetching' // 'fetching', 'success', 'error'
};

/**
 * Fetches HSI data from AASTOCKS homepage.
 * Parses the HTML to find the HSI price banner.
 */
async function getHsiData() {
    try {
        const response = await fetch(AASTOCKS_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const html = await response.text();
        
        // Refined Strategy: Look specifically for the HSI price near keywords like "恒生指數", "恒指", or "HSI".
        // The price format is typically xx,xxx.xx (with commas).
        
        // Pattern: Keyword followed by optional chars, then the price number
        const hsiContextRegex = /(?:恒生指數|恒指|HSI|Hang Seng)[^0-9]{0,100}?(\d{1,3}(?:,\d{3})+\.\d{2})/i;
        const contextMatch = html.match(hsiContextRegex);

        if (contextMatch && contextMatch[1]) {
            // Clean the price string (remove commas)
            const price = parseFloat(contextMatch[1].replace(/,/g, ''));
            
            return {
                price: price,
                change: 0, // Change % parsing requires complex DOM parsing, keeping simple for now
                changePercent: 0,
                timestamp: new Date().toLocaleString('en-HK', { timeZone: 'Asia/Shanghai' }),
                source: 'AASTOCKS (Live)',
                status: 'success'
            };
        } else {
            // Fallback: If specific context fails, try to find ANY large number (20,000+) that looks like HSI
            const largePriceRegex = /(\d{2,3}(?:,\d{3})+\.\d{2})/g;
            const allPrices = html.match(largePriceRegex);
            
            if (allPrices && allPrices.length > 0) {
                // Take the first large number (likely HSI)
                const price = parseFloat(allPrices[0].replace(/,/g, ''));
                if (price > 10000) { // Sanity check: HSI should be > 10,000
                    return {
                        price: price,
                        change: 0,
                        changePercent: 0,
                        timestamp: new Date().toLocaleString('en-HK', { timeZone: 'Asia/Shanghai' }),
                        source: 'AASTOCKS (Live)',
                        status: 'success'
                    };
                }
            }
            throw new Error('HSI price pattern not found in HTML');
        }

    } catch (error) {
        console.error(`Error fetching HSI data: ${error.message}`);
        return {
            price: 0,
            change: 0,
            changePercent: 0,
            timestamp: new Date().toLocaleString('en-HK', { timeZone: 'Asia/Shanghai' }),
            source: 'AASTOCKS (Error)',
            status: 'error',
            errorMsg: error.message
        };
    }
}

// Generate HTML Dashboard
const generateHtml = (data) => {
    const isPositive = data.change >= 0;
    const colorClass = data.status === 'error' ? 'negative' : (isPositive ? 'positive' : 'negative');
    const arrow = data.status === 'error' ? '⚠️' : (isPositive ? '▲' : '▼');
    const displayPrice = data.status === 'error' ? 'N/A' : data.price.toLocaleString();
    const displayChange = data.status === 'error' ? data.errorMsg : `${Math.abs(data.change).toLocaleString()} (${isPositive ? '+' : ''}${data.changePercent}%)`;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="30"> <!-- Auto-reload every 30s -->
    <title>HSI Tracker - Live</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f0f2f5; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 100%; }
        h1 { margin: 0 0 0.5rem 0; color: #1a1a1a; font-size: 1.5rem; }
        .price { font-size: 3rem; font-weight: 700; color: #1a1a1a; margin: 1rem 0; }
        .change { font-size: 1.5rem; font-weight: 600; padding: 0.5rem 1rem; border-radius: 6px; display: inline-block; }
        .positive { color: #00c853; background: #e8f5e9; }
        .negative { color: #d32f2f; background: #ffebee; }
        .meta { color: #666; margin-top: 1.5rem; font-size: 0.9rem; }
        .refresh-hint { margin-top: 1rem; font-size: 0.8rem; color: #999; }
        .status-dot { height: 10px; width: 10px; background-color: #bbb; border-radius: 50%; display: inline-block; margin-right: 5px; }
        .status-ok { background-color: #00c853; }
        .status-err { background-color: #d32f2f; }
    </style>
    <script>
        // Optional: Simple countdown to refresh
        let secondsLeft = 30;
        setInterval(() => {
            secondsLeft--;
            const el = document.getElementById('timer');
            if(el) el.innerText = secondsLeft;
            if(secondsLeft <= 0) secondsLeft = 30;
        }, 1000);
    </script>
</head>
<body>
    <div class="card">
        <h1>Hang Seng Index</h1>
        <div class="price">${displayPrice}</div>
        <div class="change ${colorClass}">
            ${arrow} ${displayChange}
        </div>
        <div class="meta">
            <div><span class="status-dot ${data.status === 'success' ? 'status-ok' : 'status-err'}"></span>${data.source}</div>
            <div>Last Update: ${data.timestamp}</div>
            <div style="font-size:0.75rem; color:#999; margin-top:4px;">Refreshes in: <span id="timer">30</span>s</div>
            <div class="refresh-hint">Page auto-reloads every 30s</div>
        </div>
    </div>
</body>
</html>
`;
};

// Fetch data periodically (every 30 seconds)
async function updateData() {
    console.log('Fetching latest HSI data from AASTOCKS...');
    const data = await getHsiData();
    latestHsiData = data;
    if (data.status === 'success') {
        console.log(`✓ HSI Price: ${data.price}`);
    } else {
        console.log(`✗ Fetch failed: ${data.errorMsg}`);
    }
}

// Initial fetch
updateData();
// Auto-update every 30 seconds
setInterval(updateData, 30000);

const server = http.createServer(async (req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
        const html = generateHtml(latestHsiData);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
    }
});

server.listen(PORT, HOST, () => {
    console.log(`🚀 HSI Server Running`);
    console.log(`====================`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📁 Workspace: ${path.join(__dirname, '..')}`);
    console.log(`\nPress Ctrl+C to stop`);
});
