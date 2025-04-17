// In this file we'll create a small test script to verify our PUBG API service is working correctly
const pubgApiService = require('./fixedPubgApiService');

async function testSearch() {
  console.log('Testing search with fixed PUBG API service...');
  
  try {
    const results = await pubgApiService.searchCustomMatches({
      playerName: 'Brjanzi',
      platform: 'steam',
      timeRange: '7d', 
      customMatchOnly: false
    });
    
    console.log(`Search successful! Found ${results.length} matches.`);
    
    if (results.length > 0) {
      console.log('First match details:');
      console.log(`- Match ID: ${results[0].data.id}`);
      console.log(`- Created at: ${results[0].data.attributes.createdAt}`);
      console.log(`- Map: ${results[0].data.attributes.mapName}`);
      console.log(`- Game mode: ${results[0].data.attributes.gameMode}`);
      console.log(`- Custom match: ${results[0].data.attributes.isCustomMatch}`);
    }
    
    return true;
  } catch (error) {
    console.error('Search test failed with error:', error);
    return false;
  }
}

// Run the test
testSearch()
  .then(success => {
    console.log(`Test ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error during test:', error);
    process.exit(1);
  });
