// database/db-config.js
// SQL Server connection configuration for InReal portal

const sql = require('mssql');

// Database connection configuration
const dbConfig = {
  server: process.env.DB_SERVER || 'localhost\\SQLEXPRESS', // Update if using named instance
  database: process.env.DB_NAME || 'InReal_Demo',
  authentication: {
    type: 'default',
    options: {
      userName: process.env.DB_USER || 'sa', // SQL Server username
      password: process.env.DB_PASSWORD || 'YourPassword123', // Update with your SA password
    }
  },
  options: {
    encrypt: true, // Required for Azure SQL, optional for local
    trustServerCertificate: true, // For local development
    enableKeepAlive: true,
  }
};

// Create connection pool
let pool;

async function connectToDatabase() {
  try {
    pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();
    console.log('✓ Connected to SQL Server database');
    return pool;
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    throw error;
  }
}

async function getConnection() {
  if (!pool) {
    await connectToDatabase();
  }
  return pool;
}

async function closeConnection() {
  if (pool) {
    await pool.close();
    console.log('Database connection closed');
  }
}

// Example query function
async function query(sqlQuery, params = []) {
  try {
    const pool = await getConnection();
    const request = pool.request();
    
    // Bind parameters if provided
    if (params && Object.keys(params).length > 0) {
      for (const [key, value] of Object.entries(params)) {
        request.input(key, value);
      }
    }
    
    const result = await request.query(sqlQuery);
    return result.recordset;
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
}

module.exports = {
  dbConfig,
  connectToDatabase,
  getConnection,
  closeConnection,
  query,
  sql
};
