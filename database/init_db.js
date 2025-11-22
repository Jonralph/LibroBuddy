// Script to initialize the SQLite database with schema and dummy data

// Import required modules
const sqlite3 = require('sqlite3').verbose(); // SQLite database driver
const fs = require('fs'); // File system module
const path = require('path'); // Path utility

// Define paths for the database file and schema SQL file
const dbPath = path.join(__dirname, 'airline.db');
const schemaPath = path.join(__dirname, 'schema.sql');

// Read the schema SQL file (contains table definitions and dummy data)
const schema = fs.readFileSync(schemaPath, 'utf8');
// Open (or create) the SQLite database
const db = new sqlite3.Database(dbPath);

// Execute the schema SQL to set up tables and insert dummy data
db.exec(schema, err => {
  if (err) {
    // Print error if initialization fails
    console.error('Error initializing database:', err.message);
  } else {
    // Print success message
    console.log('Database initialized successfully.');
  }
  // Close the database connection
  db.close();
});
