/**
 * PUBG API Monitor Utility
 * 
 * This utility provides monitoring and logging for PUBG API usage,
 * helping track rate limits and identify potential issues.
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class ApiMonitor {
  constructor() {
    this.apiCalls = [];
    this.errorCounts = {};
    this.startTime = Date.now();
    this.logDir = path.join(__dirname, '..', '..', 'logs');
    this.logFile = path.join(this.logDir, `api-usage-${new Date().toISOString().split('T')[0]}.log`);
    this.rateLimitWarningThreshold = 8; // 80% of 10 requests per minute
    
    // Ensure log directory exists
    this.ensureLogDir();
    
    // Start periodic log writes
    this.startPeriodicLogging();
  }
  
  /**
   * Ensure log directory exists
   */
  async ensureLogDir() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Error creating log directory:', error);
    }
  }
  
  /**
   * Start periodic logging of API usage
   */
  startPeriodicLogging() {
    // Log every 5 minutes
    this.loggingInterval = setInterval(() => {
      this.writeStatsToLog();
    }, 5 * 60 * 1000);
  }
  
  /**
   * Record an API call
   * @param {string} endpoint - API endpoint being called
   * @param {string} method - HTTP method
   * @param {number} statusCode - Response status code
   * @param {number} responseTime - Response time in milliseconds
   */
  recordApiCall(endpoint, method, statusCode, responseTime) {
    const timestamp = Date.now();
    
    this.apiCalls.push({
      timestamp,
      endpoint,
      method,
      statusCode,
      responseTime
    });
    
    // Keep only the last 1000 calls to avoid memory issues
    if (this.apiCalls.length > 1000) {
      this.apiCalls.shift();
    }
    
    // Check for rate limit warning
    const lastMinute = timestamp - 60 * 1000;
    const callsLastMinute = this.apiCalls.filter(call => call.timestamp > lastMinute).length;
    
    if (callsLastMinute >= this.rateLimitWarningThreshold) {
      console.warn(`⚠️ RATE LIMIT WARNING: ${callsLastMinute} requests in the last minute (${this.rateLimitWarningThreshold} threshold)`);
      this.writeStatsToLog(true); // Force immediate log write on warning
    }
  }
  
  /**
   * Record an API error
   * @param {string} endpoint - API endpoint
   * @param {string} errorCode - Error code
   * @param {string} errorMessage - Error message
   */
  recordApiError(endpoint, errorCode, errorMessage) {
    // Track error counts
    this.errorCounts[errorCode] = (this.errorCounts[errorCode] || 0) + 1;
    
    // Add to API calls with error information
    this.recordApiCall(endpoint, 'ERROR', 500, 0);
    
    // Log error details
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} ERROR [${errorCode}] ${endpoint}: ${errorMessage}${os.EOL}`;
    
    // Append to error log
    fs.appendFile(this.logFile, logEntry).catch(err => {
      console.error('Error writing to API error log:', err);
    });
  }
  
  /**
   * Get current API usage statistics
   * @returns {Object} API usage stats
   */
  getStats() {
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    const lastHour = now - 60 * 60 * 1000;
    const lastMinute = now - 60 * 1000;
    
    // Filter calls by time periods
    const calls24h = this.apiCalls.filter(call => call.timestamp > last24h);
    const callsLastHour = this.apiCalls.filter(call => call.timestamp > lastHour);
    const callsLastMinute = this.apiCalls.filter(call => call.timestamp > lastMinute);
    
    // Calculate average response times
    const avgResponseTime = calls24h.length > 0 
      ? calls24h.reduce((sum, call) => sum + call.responseTime, 0) / calls24h.length 
      : 0;
    
    // Count errors
    const errors24h = calls24h.filter(call => call.statusCode >= 400).length;
    
    // Group calls by endpoint
    const endpointCounts = {};
    calls24h.forEach(call => {
      const key = `${call.method} ${call.endpoint}`;
      endpointCounts[key] = (endpointCounts[key] || 0) + 1;
    });
    
    // Sort endpoints by frequency
    const topEndpoints = Object.entries(endpointCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    return {
      totalCalls: this.apiCalls.length,
      calls24h: calls24h.length,
      callsLastHour: callsLastHour.length,
      callsLastMinute: callsLastMinute.length,
      avgResponseTime,
      errors24h,
      errorCounts: this.errorCounts,
      topEndpoints,
      uptime: Math.floor((now - this.startTime) / 1000 / 60) // minutes
    };
  }
  
  /**
   * Write current stats to log file
   * @param {boolean} isWarning - Whether this is a warning log
   */
  async writeStatsToLog(isWarning = false) {
    try {
      const stats = this.getStats();
      const timestamp = new Date().toISOString();
      
      let logEntry = `==================== API USAGE STATS ${isWarning ? '(WARNING)' : ''} ====================\n`;
      logEntry += `Timestamp: ${timestamp}\n`;
      logEntry += `Uptime: ${stats.uptime} minutes\n`;
      logEntry += `Total calls tracked: ${stats.totalCalls}\n`;
      logEntry += `Calls (24h): ${stats.calls24h}\n`;
      logEntry += `Calls (1h): ${stats.callsLastHour}\n`;
      logEntry += `Calls (1m): ${stats.callsLastMinute}\n`;
      logEntry += `Avg response time: ${stats.avgResponseTime.toFixed(2)}ms\n`;
      logEntry += `Errors (24h): ${stats.errors24h}\n`;
      logEntry += `\nTop endpoints:\n`;
      
      stats.topEndpoints.forEach(([endpoint, count]) => {
        logEntry += `  ${endpoint}: ${count} calls\n`;
      });
      
      logEntry += `\nError counts:\n`;
      Object.entries(stats.errorCounts).forEach(([code, count]) => {
        logEntry += `  ${code}: ${count}\n`;
      });
      
      logEntry += `=================================================================\n\n`;
      
      await fs.appendFile(this.logFile, logEntry);
      
      if (isWarning) {
        console.warn(`API usage warning logged to ${this.logFile}`);
      }
    } catch (error) {
      console.error('Error writing API stats to log:', error);
    }
  }
  
  /**
   * Stop the monitor and cleanup
   */
  stop() {
    if (this.loggingInterval) {
      clearInterval(this.loggingInterval);
    }
    
    // Write final stats
    this.writeStatsToLog();
  }
}

// Export singleton instance
const apiMonitor = new ApiMonitor();
module.exports = apiMonitor;