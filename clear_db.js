require('dotenv').config();
const db = require('./api/_db');

async function run() {
  try {
    await db.query('DELETE FROM activities;');
    await db.query('DELETE FROM leads;');
    await db.query('DELETE FROM clients;');
    console.log('Database tables cleared.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
