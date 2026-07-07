require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
p.query("UPDATE clients SET account_id='101448221738798' WHERE id='earney' RETURNING id,name,account_id")
  .then(r => { process.stdout.write(JSON.stringify(r.rows) + '\n'); p.end(); })
  .catch(e => { process.stdout.write('ERR:' + e.message + '\n'); p.end(); });
