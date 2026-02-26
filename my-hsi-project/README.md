# HSI Viewer - Multi-Source Validator

A **production-grade Node.js application** that tracks the Hang Seng Index (HSI) by aggregating and cross-validating data from **5 authoritative sources** in real-time.

## 🏆 Key Features

- ✅ **5-Source Validation**: Aggregates data from AASTOCKS, Yahoo Finance, Bloomberg, Reuters, and HSI Company (Official)
- ✅ **Outlier Detection**: Automatically discards anomalous data points deviating >1.5% from consensus
- ✅ **Confidence Scoring**: Displays data reliability (High/Medium/Low) based on source agreement
- ✅ **Real-Time Dashboard**: Live HTML interface with auto-refresh (30s intervals)
- ✅ **Configurable**: Add/remove data points and sources via `config.json` without code changes
- ✅ **Modular Architecture**: Clean separation of concerns (Fetcher, Validator, Orchestrator)

## 🏗️ Architecture

```
my-hsi-project/
├── src/
│   ├── index.js        # Main orchestrator & HTTP server
│   ├── fetcher.js      # Parallel data fetching & regex extraction
│   └── validator.js    # Cross-validation & outlier detection
├── config.json         # Data points, sources, regex patterns, tolerance
├── package.json        # Dependencies
└── README.md           # This file
```

### How It Works

1. **Fetch**: Every 30 seconds, parallel HTTP requests are sent to all configured sources
2. **Extract**: Each source's HTML is parsed using custom regex patterns
3. **Validate**: 
   - Calculate average of all successful sources
   - Flag sources deviating >1.5% as outliers
   - Recalculate consensus from non-outlier sources
4. **Display**: Dashboard shows consensus price, confidence level, and source details

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run the Application

```bash
node src/index.js
```

### 3. Access Dashboard

Open your browser to: **http://localhost:3000**

The dashboard auto-refreshes every 30 seconds.

## ⚙️ Configuration

Edit `config.json` to customize:

- **Data Points**: Add new indices (e.g., USD/HKD, Gold, S&P 500)
- **Sources**: Add/remove data sources per data point
- **Regex Patterns**: Customize extraction patterns for each source
- **Tolerance**: Adjust outlier detection threshold (default: 1.5%)
- **Refresh Interval**: Change update frequency (default: 30s)

### Example: Adding a New Data Point

```json
{
  "dataPoints": [
    {
      "id": "hsi",
      "name": "Hang Seng Index",
      "unit": "HKD",
      "tolerancePercent": 1.5,
      "sources": [ ... ]
    },
    {
      "id": "usd-hkd",
      "name": "USD/HKD Exchange Rate",
      "unit": "HKD",
      "tolerancePercent": 0.5,
      "sources": [
        {
          "id": "xe",
          "name": "XE.com",
          "url": "https://www.xe.com/currencyconverter/convert/?Amount=1&From=USD&To=HKD",
          "regex": "your-regex-here",
          "group": 1
        }
      ]
    }
  ]
}
```

## 📊 Current Data Sources

| # | Source | Type | Role |
|---|--------|------|------|
| 1 | **AASTOCKS** | Local HK Vendor | Real-time local market data |
| 2 | **Yahoo Finance** | Retail Aggregator | Global retail benchmark |
| 3 | **Bloomberg** | Institutional | Professional terminal data |
| 4 | **Reuters** | Global Wire | International news & data |
| 5 | **HSI Company** | **Official Source** | **Ground truth / Authority** |

## 🔍 Validation Logic

The system uses a **consensus algorithm** to ensure data integrity:

1. **Successful Fetch**: Source returns valid HTML and regex matches
2. **Average Calculation**: Mean of all successful source values
3. **Deviation Check**: `(|value - average| / average) × 100`
4. **Outlier Flag**: Deviation > `tolerancePercent` (default 1.5%)
5. **Consensus**: Recalculate average excluding outliers
6. **Confidence**:
   - **High**: All (or 4-5) sources agree
   - **Medium**: 2-3 sources agree, some outliers discarded
   - **Low**: Major disagreement or all sources are outliers (rare)

## 🛠️ Development

### Project Structure

- **`src/index.js`**: Main entry point, HTTP server, HTML generation
- **`src/fetcher.js`**: HTTP fetching, regex extraction, error handling
- **`src/validator.js`**: Statistical validation, outlier detection
- **`config.json`**: Application configuration (data points, sources, regex)

### Adding a New Source

1. Open `config.json`
2. Add a new source object to the `sources` array:
   ```json
   {
     "id": "my-source",
     "name": "My Data Source",
     "url": "https://example.com/data",
     "userAgent": "Mozilla/5.0 ...",
     "regex": "(?:keyword)[\\s\\S]{0,500}?(\\d{2,3}(?:,\\d{3})+\\.\\d{2})",
     "group": 1
   }
   ```
3. Restart the server: `node src/index.js`

### Testing Regex Patterns

Use Node.js REPL to test regex patterns:

```bash
node
> const html = "Hang Seng Index 26,500.25 is up...";
> const regex = /(?:Hang Seng|HSI)[\s\S]{0,100}?(\d{2,3}(?:,\d{3})+\.\d{2})/i;
> html.match(regex);
```

## 📝 Notes

- **Created**: 2026-02-25
- **Last Updated**: 2026-02-26
- **Node Version**: v22.22.0
- **Environment**: OpenClaw Workspace
- **Repository**: https://github.com/jackbauertv24-droid/hsi-viewer

## 🎯 Future Enhancements

- [ ] Add historical data logging (SQLite/PostgreSQL)
- [ ] Price alert notifications (Email/SMS/Telegram)
- [ ] WebSocket support for real-time push updates
- [ ] API endpoint for external integrations (`/api/hsi`)
- [ ] Chart.js integration for price history visualization
- [ ] Docker containerization for easy deployment

## 📄 License

MIT

---

**Built with ❤️ for reliable HSI data validation**
