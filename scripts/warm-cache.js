require('dotenv').config();
const { cacheAllPostsForSearch } = require('../lib/search/cachePosts');

(async () => {
  try {
    console.log('Starting cache warm-up...');
    await cacheAllPostsForSearch();
    console.log('Cache warm-up completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error during cache warm-up:', error);
    process.exit(1);
  }
})(); 