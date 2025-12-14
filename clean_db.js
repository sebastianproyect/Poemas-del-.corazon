const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'poems.db');
const db = new sqlite3.Database(dbPath);

db.run("DELETE FROM poems WHERE title = 'Test Poema'", function (err) {
    if (err) {
        return console.error(err.message);
    }
    console.log(`Borrados ${this.changes} poemas de prueba.`);
});

db.close();
