const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL;

const dbConfig = connectionString ? {
    connectionString,
    ssl: { rejectUnauthorized: false }
} : {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
};

if (connectionString) {
    console.log('Using DATABASE_URL for Postgres connection');
} else {
    console.log('Database configuration:', {
        user: dbConfig.user,
        host: dbConfig.host,
        database: dbConfig.database,
        port: dbConfig.port,
    });
}

const pool = new Pool(dbConfig);

const initializeDatabase = async () => {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('Database schema initialized successfully');
};

pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to the PostgreSQL database:', err);
    } else {
        console.log('Connected to the PostgreSQL database successfully');
        release();
        initializeDatabase().catch(initErr => {
            console.error('Error initializing database schema:', initErr);
        });
    }
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};