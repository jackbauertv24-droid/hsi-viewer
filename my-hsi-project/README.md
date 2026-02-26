# Market Data Validator - Multi-Asset Dashboard

A **production-grade Node.js application** that tracks multiple financial assets (Hang Seng Index, Bitcoin, Gold) by aggregating and cross-validating data from **11 authoritative sources** in real-time.

## 🏆 Key Features

- ✅ **Multi-Asset Tracking**: HSI (4 sources), Bitcoin (4 sources), Gold (3 sources)
- ✅ **Multi-Source Validation**: Aggregates data from exchanges, aggregators, and institutional sources
- ✅ **Outlier Detection**: Automatically discards anomalous data points deviating >1.5-2% from consensus
- ✅ **Confidence Scoring**: Displays data reliability (High/Medium/Low) based on source agreement
- ✅ **Real-Time Dashboard**: Live HTML interface with dynamic cards, auto-refresh (~5 min)
- ✅ **Polite Fetching**: 5-minute intervals with random jitter to avoid blocking
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

1. **Fetch**: Every ~5 minutes, parallel HTTP requests sent to all configured sources
2. **Extract**: Each source's HTML parsed using custom regex patterns
3. **Validate**:
   - Calculate average of all successful sources
   - Flag sources deviating > tolerance% as outliers
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

The dashboard auto-refreshes every ~5 minutes with random jitter.

## ⚙️ Configuration

Edit `config.json` to customize:

- **Data Points**: Add new assets (e.g., Silver, Oil, USD/HKD, Ethereum)
- **Sources**: Add/remove data sources per data point
- **Regex Patterns**: Customize extraction patterns for each source
- **Tolerance**: Adjust outlier detection threshold (1.5-2% typical)
- **Refresh Interval**: Change update frequency (default: 300s)
- **Jitter**: Random delay to avoid robotic patterns (default: 10s)

### Example: Adding a New Data Point

```json
{
  "dataPoints": [
    {
      "id": "hsi",
      "name": "Hang Seng Index",
      "unit": "HKD",
      "tolerancePercent": 1.5,
      "sources": [...]
    },
    {
      "id": "silver",
      "name": "Silver Price",
      "unit": "USD/oz",
      "tolerancePercent": 2.0,
      "sources": [
        {
          "id": "kitco",
          "name": "Kitco",
          "url": "https://www.kitco.com/silver-price/",
          "userAgent": "Mozilla/5.0...",
          "regex": "(?:Silver|XAG)[\\s\\S]{0,500}?(\\d{1,3}(?:,\\d{3})+\\.\\d{2})",
          "group": 1
        }
      ]
    }
  ]
}
```

## 📊 Current Data Sources

### Hang Seng Index (4 sources)
| # | Source | Type | Role |
|---|--------|------|------|
| 1 | **AASTOCKS** | Local HK Vendor | Real-time local market data |
| 2 | **Yahoo Finance** | Retail Aggregator | Global retail benchmark |
| 3 | **Bloomberg** | Institutional | Professional terminal data |
| 4 | **Reuters** | Global Wire | International news & data |

### Bitcoin (4 sources)
| # | Source | Type | Role |
|---|--------|------|------|
| 1 | **CoinMarketCap** | Crypto Aggregator | Leading crypto price aggregator |
| 2 | **Yahoo Finance** | Retail Aggregator | Global retail benchmark |
| 3 | **Investing.com** | Financial Portal | Market data & news |
| 4 | **Binance** | Crypto Exchange | World's largest crypto exchange |

### Gold (3 sources)
| # | Source | Type | Role |
|---|--------|------|------|
| 1 | **TradingView** | Charting Platform | Professional charts & data |
| 2 | **Kitco** | Precious Metals | Gold & silver specialist |
| 3 | **VeraCash** | Precious Metals | Gold price tracking |

## 🔍 Validation Logic

The system uses a **consensus algorithm** to ensure data integrity:

1. **Successful Fetch**: Source returns valid HTML and regex matches
2. **Average Calculation**: Mean of all successful source values
3. **Deviation Check**: `(|value - average| / average) × 100`
4. **Outlier Flag**: Deviation > `tolerancePercent` (asset-specific)
5. **Consensus**: Recalculate average excluding outliers
6. **Confidence**:
   - **High**: All (or most) sources agree
   - **Medium**: Some sources disagree, outliers discarded
   - **Low**: Major disagreement or multiple outliers

### Tolerance Settings by Asset
- **HSI**: 1.5% (stable index)
- **Bitcoin**: 2.0% (crypto volatility)
- **Gold**: 1.5% (precious metals stability)

## 🛠️ Development

### Project Structure

- **`src/index.js`**: Main entry point, HTTP server, HTML generation, scheduling
- **`src/fetcher.js`**: HTTP fetching, regex extraction, error handling
- **`src/validator.js`**: Statistical validation, outlier detection, consensus building
- **`config.json`**: Application configuration (data points, sources, regex)

### Adding a New Source

1. Open `config.json`
2. Add a new source object to the `sources` array:
```json
{
  "id": "my-source",
  "name": "My Data Source",
  "url": "https://example.com/data",
  "userAgent": "Mozilla/5.0...",
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

### Polite Fetching Strategy

- **Interval**: 300 seconds (5 minutes) between updates
- **Jitter**: ±10 seconds random delay to avoid robotic patterns
- **User-Agent**: Realistic browser headers for each request
- **Parallel Fetching**: All sources fetched simultaneously to minimize load time

## 📝 Notes

- **Created**: 2026-02-25
- **Last Updated**: 2026-02-26
- **Node Version**: v22.22.0
- **Environment**: OpenClaw Workspace
- **Repository**: https://github.com/jackbauertv24-droid/hsi-viewer
- **Total Sources**: 11 across 3 asset classes
- **Architecture**: Multi-source validator with outlier detection

## 🎯 Future Enhancements

- [ ] Historical data logging (SQLite/PostgreSQL)
- [ ] Price alert notifications (Email/SMS/Telegram/Discord)
- [ ] WebSocket support for real-time push updates
- [ ] REST API endpoint for external integrations (`/api/hsi`, `/api/btc`, `/api/gold`)
- [ ] Chart.js or Recharts integration for price history visualization
- [ ] Docker containerization for easy deployment
- [ ] Additional asset classes (Silver, Oil, USD/HKD, Ethereum, S&P 500)
- [ ] Source health monitoring (uptime tracking, auto-disable failing sources)
- [ ] Export data to CSV/Excel

## 📄 License

MIT

---

**Built with ❤️ for reliable multi-asset data validation**

*Currently tracking: Hang Seng Index 🏦 | Bitcoin 🪙 | Gold 🏆*
