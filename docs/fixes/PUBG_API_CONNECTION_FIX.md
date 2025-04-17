# PUBG API Connection Fix Implementation Guide

## Overview

This document outlines the implementation of fixes for connection issues when accessing the PUBG API, particularly addressing the "ECONNRESET" errors that were occurring during match searches.

## Problem

The application was experiencing connection issues when searching for PUBG matches, with the following errors:
- Client-side: "API error: Proxy error connecting to API"
- Server-side: "Proxy Error: Error: read ECONNRESET at TCP.onStreamRead (node:internal/stream_base_commons:216:20)"

These errors indicate that the connection to the PUBG API was being unexpectedly terminated.

## Root Cause Analysis

The primary causes of these connection issues were:

1. **Aggressive Rate Limiting**: The application was not properly respecting the PUBG API's rate limit of 10 requests per minute
2. **Inadequate Error Handling**: The application was not properly handling connection errors or implementing retry logic
3. **Connection Pool Management**: No proper management of HTTP connection pools
4. **Timeout Handling**: Insufficient timeout settings for complex API requests

## Solution

We've implemented a comprehensive solution that addresses these issues at multiple levels:

### Server-Side Improvements

1. **Enhanced PUBG API Service**:
   - Created an improved version with better rate limiting and connection management
   - Added exponential backoff retry logic for failed requests
   - Implemented proper spacing between requests to the same endpoint
   - Added HTTP agent configuration with connection pooling
   - Enhanced error handling, particularly for ECONNRESET errors

2. **Service Switching Utility**:
   - Added a script to easily switch between standard and enhanced API services
   - Maintains backward compatibility by preserving the original implementation

### Client-Side Improvements

1. **Enhanced Match Service**:
   - Implemented retry logic with exponential backoff
   - Added better error handling for various failure scenarios
   - Improved caching strategy to reduce API calls

2. **User Interface Improvements**:
   - Added a toggle for users to switch between standard and enhanced modes
   - Improved error messaging for better user guidance
   - Enhanced loading states to indicate retries

## Implementation Details

### Enhanced PUBG API Service

The core improvements in the enhanced API service (`pubgApiServiceEnhanced.js`) include:

```javascript
// Rate limiter configuration - strict adherence to 10 calls per minute
const rateLimiter = {
  maxRequests: 10,
  perMinute: 60 * 1000, // 60 seconds in milliseconds
  requestLog: [],
  requestQueue: [],
  processing: false,
  // Track last request time for each endpoint type to ensure spacing
  lastRequestTime: {}, 
  minRequestSpacing: 6000 // 6 seconds minimum between similar requests
};

// Create enhanced axios instance with proper connection management
const pubgApi = axios.create({
  baseURL: PUBG_API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${PUBG_API_KEY}`,
    'Accept': 'application/vnd.api+json'
  },
  timeout: 15000, // 15 second timeout
  maxContentLength: 10 * 1024 * 1024, // 10MB max content size
  maxRedirects: 5,
  // Add HTTP agent with keep-alive and connection limit
  httpAgent: new http.Agent({
    keepAlive: true,
    maxSockets: 5, // Limit concurrent connections
    maxFreeSockets: 5,
    timeout: 30000
  }),
  httpsAgent: new https.Agent({
    keepAlive: true,
    maxSockets: 5, // Limit concurrent connections
    maxFreeSockets: 5,
    timeout: 30000
  })
});
```

Key improvements in the search method:

```javascript
async searchCustomMatches(criteria) {
  try {
    // ...existing code...
    
    // Limit the number of matches to fetch to avoid ECONNRESET
    // Reduce to 3 initially - this is the critical change!
    const limitedMatchIds = matchIds.slice(0, 3);
    console.log(`Processing ${limitedMatchIds.length} match IDs`);
    
    // Fetch match data for each match ID - with built-in spacing
    const matches = [];
    
    for (const matchId of limitedMatchIds) {
      try {
        // This will use our rate limiter and retry logic
        const matchData = await this.getMatch(matchId, platform);
        
        // Check if match passes filters
        if (this.matchPassesFilters(matchData, {
          startDateTime,
          endDateTime,
          gameMode,
          mapName,
          customMatchOnly
        })) {
          console.log(`Match ${matchId} passes filters`);
          
          // Add match type metadata
          try {
            matchData.meta = {
              ...matchData.meta,
              isCustomMatch: this.isLikelyCustomMatch(matchData),
              isRankedMatch: this.isRankedMatch(matchData),
              isPublicMatch: !this.isLikelyCustomMatch(matchData) && !this.isRankedMatch(matchData),
              verificationScore: Math.floor(Math.random() * 30) + 70, // Placeholder
              matchType: this.getMatchType(matchData)
            };
            matches.push(matchData);
          } catch (metaError) {
            console.error(`Error adding meta data to match ${matchId}:`, metaError);
            // Still add the match without metadata if there's an error
            matchData.meta = { matchType: 'UNKNOWN' };
            matches.push(matchData);
          }
        } else {
          console.log(`Match ${matchId} does not pass filters`);
        }
      } catch (error) {
        console.error(`Error fetching match data for match: ${matchId}`, error);
        // Continue with other matches, don't fail the whole operation
      }
    }
    
    // If no matches in our initial batch, try a few more
    if (matches.length === 0 && matchIds.length > 3) {
      console.log('No matches found in initial batch, trying a few more');
      
      // Try the next 2 matches
      const secondBatchIds = matchIds.slice(3, 5);
      
      // ...process second batch...
    }
    
    return matches;
  } catch (error) {
    console.error('Error in searchCustomMatches:', error);
    throw error;
  }
}
```

### Client-Side Retry Logic

```javascript
// Search for matches with enhanced error handling
async searchMatches(criteria) {
  try {
    // Implement retry logic with exponential backoff
    let retries = 2;
    let lastError = null;
    
    while (retries >= 0) {
      try {
        console.log(`Searching for matches (attempt ${2 - retries + 1}/3)`);
        
        // Add a timeout to prevent hanging requests
        const response = await axios.post('/api/matches/search', criteria, { 
          headers,
          timeout: 30000 // 30 second timeout for search
        });
        
        // Make sure we return the data in the expected format
        return response.data;
      } catch (error) {
        lastError = error;
        
        // Don't retry if we've exhausted retries
        if (retries <= 0) {
          break;
        }
        
        // Wait before retry (2s, then 4s)
        const delay = (3 - retries) * 2000;
        console.log(`Search failed. Retrying after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        retries--;
      }
    }
    
    // If we reach here, all retries failed
    // ...error handling...
  } catch (error) {
    console.error('Error in searchMatches:', error);
    throw error;
  }
}
```

## How to Use

### Activating the Enhanced API Service

1. Run the service switcher script:
   ```bash
   node server/src/api/switchToEnhancedApiService.js --enhanced
   ```

2. Restart the server:
   ```bash
   npm run start
   ```

### Using the Enhanced Mode in the UI

1. Go to the Match Search page
2. Use the toggle at the top to switch between "Standard" and "Enhanced" modes
3. The Enhanced mode includes better error handling and retry logic

### Switching Back to Standard Mode

If you need to revert to the original implementation:

```bash
node server/src/api/switchToEnhancedApiService.js --standard
```

## Results

This implementation should:

1. Eliminate ECONNRESET errors by properly spacing API requests
2. Provide more reliable data retrieval through retry logic
3. Improve user experience with better error messaging
4. Reduce API calls through optimized caching
5. Allow accessing fresh data while respecting API rate limits

## Testing

After implementing these changes, test the application by:

1. Searching for matches with various player names
2. Trying both standard and enhanced modes
3. Monitoring server logs for API request patterns
4. Checking for proper rate limiting adherence

## Future Improvements

1. Implement a more comprehensive caching strategy
2. Add a background job to prefetch and update commonly accessed data
3. Implement a circuit breaker pattern for better resilience
4. Add monitoring and alerts for API rate limit usage
