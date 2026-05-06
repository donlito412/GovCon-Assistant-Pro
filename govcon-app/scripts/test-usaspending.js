const { fetchPAAwards } = require('./lib/ingestion/usaspending');
fetchPAAwards().then(console.log).catch(console.error);
