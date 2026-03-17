const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../server/database.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run("ALTER TABLE media ADD COLUMN month INTEGER", (err) => {
        if (err) console.log("Month column might already exist or error:", err.message);
        else console.log("Added month column.");
    });
    db.run("ALTER TABLE media ADD COLUMN year INTEGER", (err) => {
        if (err) console.log("Year column might already exist or error:", err.message);
        else console.log("Added year column.");
    });
});

db.close();
