/**
 * HSI Viewer - Main Entry Point
 * 
 * Orchestrates data fetching from multiple sources, validates accuracy,
 * and serves a real-time dashboard with dynamic cards for each data point.
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
let latestData = {}; // Stores validated data for each data point ID

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

// Helper: Generate a single card HTML
function generateCard(id, data) {
  if (data.status === 'loading' || !data || !data.status) {
    return `
      <div class="card">
        <h1>${data.name || 'Loading...'}</h1>
        <div class="price loading">Fetching data...</div>
        <div class="meta">
          <div><span class="status-dot"></span>Initializing</div>
        </div>
      </div>
    `;
  }

  if (data.status === 'success') {
    return `
      <div class="card">
        <h1>${data.name}</h1>
        <div class="price">${data.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style="font-size:1rem;color:#666">${data.unit || ''}</span></div>
        <div class="meta">
          <div><span class="status-dot status-ok"></span>Live Data</div>
          <div>Confidence: <strong>${data.confidence.toUpperCase()}</strong></div>
          <div>Sources: ${data.sourceCount} (${data.sourceCount - (data.outlierCount || 0)} valid)</div>
          ${data.outlierCount > 0 ? `<div style="color:#d32f2f; font-size:0.8rem">⚠️ ${data.outlierCount} outlier(s) discarded</div>` : ''}
          <div>Updated: ${data.timestamp}</div>
        </div>
        
        <details>
          <summary>Source Details</summary>
          <ul style="padding-left: 20px; margin-top: 5px; font-size: 0.85rem;">
            ${data.sources ? data.sources.map(s => `<li>${s.sourceName}: ${s.value.toLocaleString()} (${s.latencyMs}ms)</li>`).join('') : ''}
            ${data.errors ? data.errors.map(e => `<li style="color:#999">${e.sourceName}: ${e.error}</li>`).join('') : ''}
          </ul>
        </details>
      </div>
    `;
  }

  // Error state
  return `
    <div class="card">
      <h1>${data.name}</h1>
      <div class="price" style="color:#d32f2f">Data Unavailable</div>
      <div class="meta">
        <div><span class="status-dot status-err"></span>Error</div>
        <div>${data.message || 'Unknown error'}</div>
        ${data.errors && data.errors.length ? `
          <details>
            <summary>Show Details</summary>
            ${data.errors.map(e => `<div style="font-size:0.85rem;margin-top:5px">${e.sourceName}: ${e.error}</div>`).join('')}
          </details>
        ` : ''}
      </div>
    </div>
  `;
}

// Generate HTML Dashboard - Dynamic Cards for each Data Point
const generateHtml = (data) => {
  const dataPoints = config.dataPoints || [];
  
  // Generate a card for each data point
  const cardsHtml = dataPoints.map(point => {
    const pointData = data[point.id];
    return generateCard(point.id, pointData || { status: 'loading', name: point.name });
  }).join('\n');

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="${config.refreshIntervalSeconds + (config.jitterSeconds || 0)}">
    <title>Market Data Dashboard - Live</title>
    <style>
      body { 
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
        background: #f0f2f5; 
        margin: 0; 
        padding: 20px; 
        box-sizing: border-box; 
      }
      .dashboard {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: 20px;
        max-width: 1400px;
        margin: 0 auto;
      }
      .card { 
        background: white; 
        padding: 2rem; 
        border-radius: 12px; 
        box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
        text-align: center; 
        transition: transform 0.2s;
      }
      .card:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(0,0,0,0.15);
      }
      h1 { margin: 0 0 0.5rem 0; color: #1a1a1a; font-size: 1.5rem; }
      .price { font-size: 3rem; font-weight: 700; color: #1a1a1a; margin: 1rem 0; }
      .positive { color: #00c853; }
      .negative { color: #d32f2f; }
      .meta { color: #666; margin-top: 1.5rem; font-size: 0.95rem; line-height: 1.6; }
      .status-dot { height: 10px; width: 10px; background-color: #bbb; border-radius: 50%; display: inline-block; margin-right: 5px; }
      .status-ok { background-color: #00c853; }
      .status-err { background-color: #d32f2f; }
      .loading { color: #999; font-style: italic; }
      details { background: #f9f9f9; padding: 10px; border-radius: 4px; margin-top: 10px; text-align: left; }
      summary { font-weight: bold; color: #555; cursor: pointer; }
    </style>
  </head>
  <body>
    <div class="dashboard">
      ${cardsHtml}
    </div>
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

// Start Up: Recursive scheduler with jitter for polite scraping
async function scheduleNext() {
  const baseInterval = config.refreshIntervalSeconds * 1000;
  const jitter = config.jitterSeconds ? (Math.random() * config.jitterSeconds * 1000) : 0;
  const delay = baseInterval + jitter;
  
  console.log(`\n⏱️  Sleeping for ${(delay/1000).toFixed(0)}s (Base: ${config.refreshIntervalSeconds}s + Jitter: ${(jitter/1000).toFixed(1)}s)...`);
  
  setTimeout(async () => {
    await updateAllData();
    scheduleNext();
  }, delay);
}

updateAllData(); // Initial fetch immediately
scheduleNext(); // Schedule recurring updates with random jitter
