const {Pool} = require('pg');

const dbConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
};

console.log('Database configuration:', {
    user: dbConfig.user,
    host: dbConfig.host,
    database: dbConfig.database,
    port: dbConfig.port,    
});

const pool = new Pool(dbConfig);

pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to the PostgreSQL database:', err);
    }  else {
        console.log('Connected to the PostgreSQL database successfully');
        release();
    }
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
}