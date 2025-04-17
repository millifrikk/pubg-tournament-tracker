/**
 * This file is a legacy compatibility layer.
 * The enhanced functionality has been directly incorporated into fixedPubgApiService.js
 * which is what pubgApiService.js now uses.
 */
const fixedPubgApiService = require('./fixedPubgApiService');

// Log that we're using the fixed service directly
console.log('Using integrated enhanced PUBG API service');

// Export the fixed service directly
module.exports = fixedPubgApiService;