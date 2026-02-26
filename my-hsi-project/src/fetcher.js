/**
 * Fetcher Module
 * Responsible for fetching data from URLs and extracting values using regex.
 */

/**
 * Fetches content from a URL and extracts a value using a regex pattern.
 * @param {Object} source - The source configuration object.
 * @returns {Promise<Object>} - Result object with value, raw, error, etc.
 */
async function fetchSource(source) {
  const startTime = Date.now();
  try {
    const response = await fetch(source.url, {
      headers: {
        'User-Agent': source.userAgent || 'Mozilla/5.0',
        'Accept': 'text/html,application/xhtml+xml'
      },
      timeout: 10000 // 10s timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    
    // Debug: Log HTML snippet if needed
    // console.log(`[DEBUG] ${source.name} HTML length: ${html.length}`);
    
    const pattern = new RegExp(source.regex, 'i'); // Always case-insensitive
    const match = html.match(pattern);

    if (!match || !match[source.group || 1]) {
      throw new Error(`Regex pattern did not match (HTML length: ${html.length})`);
    }

    const rawValue = match[source.group || 1];
    // Remove commas and parse as float
    const value = parseFloat(rawValue.replace(/,/g, ''));

    if (isNaN(value)) {
      throw new Error('Parsed value is not a number');
    }

    return {
      success: true,
      sourceId: source.id,
      sourceName: source.name,
      value: value,
      rawValue: rawValue,
      latencyMs: Date.now() - startTime
    };

  } catch (error) {
    return {
      success: false,
      sourceId: source.id,
      sourceName: source.name,
      error: error.message,
      latencyMs: Date.now() - startTime
    };
  }
}

module.exports = { fetchSource };
