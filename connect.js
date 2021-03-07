var { Pool } = require('pg');
const { pgString } = require('./config');
const pool = new Pool({
    connectionString: pgString
});

