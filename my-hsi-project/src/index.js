/**
 * HSI Viewer - Main Entry Point
 * 
 * Orchestrates data fetching from multiple sources, validates accuracy,
 * and serves a real-time dashboard.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { fetchSource } = require('./fetcher');
const { validateDataPoint } = require('./validator');

// Load configuration
const configPath = path.join(__dirname, '../config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const PORT = 3000;
const HOST = '0.0.0.0';

// Global state
let latestData = {};

/**
 * Fetches and validates data for all configured data points.
 */
async function updateAllData() {
  console.log(`\n[${new Date().toLocaleTimeString()}] Starting data update cycle...`);
  
  for (const point of config.dataPoints) {
    console.log(`  📊 Fetching ${point.name}...`);
    
    // Fetch from all sources in parallel
    const fetchPromises = point.sources.map(source => fetchSource(source));
    const results = await Promise.all(fetchPromises);
    
    // Validate and cross-check
    const validated = validateDataPoint(results, point.tolerancePercent);
    validated.name = point.name;
    validated.unit = point.unit;
    
    latestData[point.id] = validated;
    
    // Log summary
    if (validated.status === 'success') {
      const outlierNote = validated.outlierCount > 0 ? ` (${validated.outlierCount} outlier discarded)` : '';
      console.log(`     ✓ ${point.name}: ${validated.value.toLocaleString()} [Confidence: ${validated.confidence}]${outlierNote}`);
      if (validated.outlierCount > 0) {
        validated.outliers.forEach(o => {
          console.log(`     ⚠️  Outlier: ${o.sourceName} reported ${o.value} (${o.deviation} diff)`);
        });
      }
    } else {
      console.log(`     ✗ ${point.name}: Failed - ${validated.message}`);
      if (validated.errors && validated.errors.length > 0) {
        validated.errors.forEach(err => {
          console.log(`       - ${err.sourceName}: ${err.error}`);
        });
      }
    }
  }
}

// Generate HTML Dashboard
const generateHtml = (data) => {
  const hsi = data.hsi || { status: 'loading', name: 'Hang Seng Index', value: 0, errors: [] };
  
  let contentHtml = '<div class="card"><h1>Loading...</h1><p>Waiting for first data fetch...</p></div>';

  if (hsi.status === 'success') {
    const isPositive = true; // Simplified for now
    const colorClass = 'positive';
    const arrow = '▲';
    
    contentHtml = `
      <div class="card">
        <h1>${hsi.name}</h1>
        <div class="price">${hsi.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <div class="meta">
          <div><span class="status-dot status-ok"></span>Live Data</div>
          <div>Confidence: <strong>${hsi.confidence.toUpperCase()}</strong></div>
          <div>Sources Used: ${hsi.sourceCount} (${hsi.sourceCount - hsi.outlierCount} valid)</div>
          ${hsi.outlierCount > 0 ? `<div style="color:#d32f2f; font-size:0.8rem">⚠️ ${hsi.outlierCount} source(s) discarded as outliers</div>` : ''}
          <div>Last Update: ${hsi.timestamp}</div>
        </div>
        
        <div style="margin-top: 20px; text-align: left; font-size: 0.85rem; border-top: 1px solid #eee; padding-top: 10px;">
          <strong>Source Details:</strong>
          <ul style="padding-left: 20px; margin-top: 5px;">
            ${hsi.sources.map(s => `<li>${s.sourceName}: ${s.value.toLocaleString()} (${s.latencyMs}ms)</li>`).join('')}
            ${hsi.errors.map(e => `<li style="color:#999">${e.sourceName}: Failed (${e.error})</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  } else if (hsi.status === 'error') {
    contentHtml = `
      <div class="card">
        <h1>${hsi.name}</h1>
        <div class="price" style="color:#d32f2f">Data Unavailable</div>
        <div class="meta">
          <div><span class="status-dot status-err"></span>Error</div>
          <div>${hsi.message}</div>
          ${hsi.errors && hsi.errors.length ? `<details><summary style="cursor:pointer; margin-top:10px">Show Details</summary>${hsi.errors.map(e => `<div>${e.sourceName}: ${e.error}</div>`).join('')}</details>` : ''}
        </div>
      </div>
    `;
  }

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="${config.refreshIntervalSeconds}">
    <title>${hsi.name || 'Market Data'} - Live</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f0f2f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
      .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 500px; width: 100%; }
      h1 { margin: 0 0 0.5rem 0; color: #1a1a1a; font-size: 1.5rem; }
      .price { font-size: 3rem; font-weight: 700; color: #1a1a1a; margin: 1rem 0; }
      .positive { color: #00c853; }
      .negative { color: #d32f2f; }
      .meta { color: #666; margin-top: 1.5rem; font-size: 0.95rem; line-height: 1.6; }
      .status-dot { height: 10px; width: 10px; background-color: #bbb; border-radius: 50%; display: inline-block; margin-right: 5px; }
      .status-ok { background-color: #00c853; }
      .status-err { background-color: #d32f2f; }
      details { background: #f9f9f9; padding: 10px; border-radius: 4px; margin-top: 10px; }
      summary { font-weight: bold; color: #555; }
    </style>
  </head>
  <body>
    ${contentHtml}
  </body>
  </html>
  `;
};

// Server Setup
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(generateHtml(latestData));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

// Start Up
updateAllData(); // Initial fetch
setInterval(updateAllData, config.refreshIntervalSeconds * 1000);

server.listen(PORT, HOST, () => {
  console.log(`\n🚀 HSI Viewer Server Running`);
  console.log(`==========================`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`⚙️  Config: ${configPath}`);
  console.log(`🔄 Refresh: ${config.refreshIntervalSeconds}s`);
  console.log(`\nPress Ctrl+C to stop\n`);
});
