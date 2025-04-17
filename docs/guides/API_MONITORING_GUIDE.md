# PUBG API Monitoring Guide

This guide explains how to use the included API monitoring utility to track PUBG API usage and prevent rate limit issues.

## Overview

The PUBG API has a strict rate limit of 10 requests per minute. Exceeding this limit will result in 429 errors and potentially ECONNRESET errors as connections are terminated. The API monitoring utility helps track usage and provides warnings when approaching rate limits.

## Features

- Tracks all API requests to the PUBG API
- Records response times and error rates
- Logs usage statistics periodically
- Provides warnings when approaching rate limits
- Maintains historical usage data for analysis

## Quick Start

### 1. Integrating the Monitor

The API monitor is automatically installed when applying the API fixes. To manually integrate it into your code:

```javascript
// Import the API monitor
const apiMonitor = require('../utils/apiMonitor');

// In your PUBG API service
async function callPubgApi(endpoint, method) {
  const startTime = Date.now();
  
  try {
    // Make API call
    const response = await axios.get(endpoint);
    
    // Record successful call
    apiMonitor.recordApiCall(
      endpoint, 
      method, 
      response.status, 
      Date.now() - startTime
    );
    
    return response;
  } catch (error) {
    // Record error
    apiMonitor.recordApiError(
      endpoint,
      error.code || 'UNKNOWN',
      error.message
    );
    
    throw error;
  }
}
```

### 2. Viewing Monitor Data

The monitor automatically logs data to `server/logs/api-usage-YYYY-MM-DD.log`. You can also access the current statistics programmatically:

```javascript
const apiMonitor = require('../utils/apiMonitor');

// Get current usage stats
const stats = apiMonitor.getStats();
console.log(`API calls in the last minute: ${stats.callsLastMinute}`);
console.log(`Average response time: ${stats.avgResponseTime.toFixed(2)}ms`);
```

### 3. Creating a Dashboard Route

You can add a simple admin route to view the monitoring data:

```javascript
// In your API routes
router.get('/admin/api-stats', authenticateAdmin, (req, res) => {
  const stats = apiMonitor.getStats();
  res.json(stats);
});
```

## Understanding the Log Format

The log files contain entries like:

```
==================== API USAGE STATS ====================
Timestamp: 2025-03-27T15:30:45.123Z
Uptime: 120 minutes
Total calls tracked: 456
Calls (24h): 456
Calls (1h): 87
Calls (1m): 6
Avg response time: 235.42ms
Errors (24h): 12

Top endpoints:
  GET /shards/steam/players: 125 calls
  GET /shards/steam/matches: 98 calls
  GET /shards/steam/telemetry: 45 calls
  GET /shards/steam/seasons: 12 calls
  GET /shards/steam/samples: 8 calls

Error counts:
  ECONNRESET: 5
  ECONNABORTED: 3
  404: 2
  429: 2
=================================================================
```

## Warning Thresholds

The monitor will log warnings when:

- More than 8 requests are made in a 60-second window (80% of the rate limit)
- ECONNRESET errors occur frequently
- Response times exceed historical averages significantly

## Best Practices

1. **Watch for Rate Limit Warnings**: Act immediately if you see warnings in the logs or console
2. **Adjust Request Spacing**: If approaching limits, increase the `minRequestSpacing` value in the rate limiter
3. **Monitor Response Times**: Sudden increases may indicate API issues
4. **Track Error Patterns**: Frequent errors may indicate poor connection handling

## Troubleshooting

If you see frequent rate limit errors:

1. Check the logs to identify which endpoints are being called most frequently
2. Verify that rate limiting is working correctly in the enhanced API service
3. Increase caching for frequently accessed data
4. Consider implementing a request queue for batch operations
5. Add more aggressive throttling during peak usage times

## Advanced Usage

### Custom Monitoring Thresholds

You can adjust the warning thresholds in `apiMonitor.js`:

```javascript
// Change warning threshold (default is 8)
apiMonitor.rateLimitWarningThreshold = 7; // More conservative
```

### Integration with External Monitoring

The API monitor can be integrated with external monitoring services:

```javascript
// Export stats to external monitoring service
cron.schedule('*/5 * * * *', async () => {
  const stats = apiMonitor.getStats();
  
  try {
    await axios.post('https://your-monitoring-service.com/api', stats);
  } catch (error) {
    console.error('Error sending stats to monitoring service:', error);
  }
});
```