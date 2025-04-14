/**
 * Validation script for service functionality
 * Run this in the browser console to test if services are working correctly
 */

import matchesServiceEnhanced from './matchesServiceEnhanced';

console.log('Testing matchesServiceEnhanced...');
console.log('searchMatches method exists:', typeof matchesServiceEnhanced.searchMatches === 'function');
console.log('getMatchDetails method exists:', typeof matchesServiceEnhanced.getMatchDetails === 'function');
console.log('getTelemetry method exists:', typeof matchesServiceEnhanced.getTelemetry === 'function');
console.log('registerMatch method exists:', typeof matchesServiceEnhanced.registerMatch === 'function');

// If you have a sample match ID, you can test the getMatchDetails function
// const testMatchId = '1234567890abcdef';
// matchesServiceEnhanced.getMatchDetails(testMatchId)
//   .then(data => console.log('Match details retrieved successfully:', data))
//   .catch(err => console.error('Error retrieving match details:', err));

console.log('Validation complete. Check console for any errors.');
