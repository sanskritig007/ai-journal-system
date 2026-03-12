const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const DB_PATH = path.join(__dirname, "../journal.db");

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("Failed to connect to SQLite database:", err.message);
    } else {
        console.log("Connected to SQLite database.");
    }
});

// Create table if it does not exist
// Includes emotion, keywords, summary so analysis results are stored per entry
db.run(`
  CREATE TABLE IF NOT EXISTS journals (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    userId    TEXT NOT NULL,
    ambience  TEXT NOT NULL,
    text      TEXT NOT NULL,
    emotion   TEXT,
    keywords  TEXT,
    summary   TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
    if (err) {
        console.error("Failed to create journals table:", err.message);
    }
});

module.exports = db;