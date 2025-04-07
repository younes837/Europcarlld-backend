const sql = require("mssql");

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  requestTimeout: 80000,
};

const connectToDatabase = async () => {
  try {
    await sql.connect(config);
    console.log("Connected to the database");
  } catch (error) {
    console.error("Database connection failed: ", error.message);
  }
};

module.exports = { sql, connectToDatabase };
