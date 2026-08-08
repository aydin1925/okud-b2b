// scripts/run-scan.js
require('dotenv').config();
const documentExpiryJob = require('../jobs/documentExpiryJob');

(async () => {
  await documentExpiryJob.runScan();
  process.exit(0);
})();