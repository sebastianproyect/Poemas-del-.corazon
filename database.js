const path = require('path');

let db;

// Detectar si estamos en Vercel (Postgres) o Local (SQLite)
if (process.env.POSTGRES_URL) {
    console.log('Detectado entorno Vercel: Usando Postgres...');
    const { Pool } = require('pg');
    db = new Pool({
        connectionString: process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false }
    });

    // Adaptador para interfaz común (query/run/get/all)
    db._query = db.query; // Guardar original

    // Método para inicializar tablas en Postgres
    const initPostgres = async () => {
        try {
            await db.query(`CREATE TABLE IF NOT EXISTS poems (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);

            await db.query(`CREATE TABLE IF NOT EXISTS comments (
                id SERIAL PRIMARY KEY,
                poem_id INTEGER NOT NULL REFERENCES poems(id) ON DELETE CASCADE,
                author TEXT NOT NULL,
                email TEXT,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            console.log('Tablas Postgres verificadas.');
        } catch (err) {
            console.error('Error init Postgres:', err);
        }
    };
    initPostgres();

    // Sobrescribir métodos para coincidir con estilo sqlite
    db.all = (sql, params, callback) => {
        // Convertir ? a $1, $2, etc.
        let i = 1;
        const pgSql = sql.replace(/\?/g, () => `$${i++}`);
        db._query(pgSql, params || [], (err, res) => {
            if (callback) callback(err, res ? res.rows : []);
        });
    };

    db.get = (sql, params, callback) => {
        let i = 1;
        const pgSql = sql.replace(/\?/g, () => `$${i++}`) + ' LIMIT 1';
        db._query(pgSql, params || [], (err, res) => {
            if (callback) callback(err, res && res.rows.length ? res.rows[0] : null);
        });
    };

    db.run = function (sql, params, callback) {
        let i = 1;
        const pgSql = sql.replace(/\?/g, () => `$${i++}`);
        db._query(pgSql, params || [], function (err, res) {
            // Simular 'this' con lastID/changes si es posible (en PG es returning id)
            // Para inserts simples sin RETURNING, lastID no estará disponible fácilmente sin cambiar la query
            // Hack para inserts:
            const context = { lastID: 0, changes: 0 };
            if (res) {
                if (res.command === 'INSERT' && res.rows.length > 0) context.lastID = res.rows[0].id;
                context.changes = res.rowCount;
            }
            if (callback) callback.call(context, err, res);
        });
    };

    // Nota Crítica: Para que db.run devuelva lastID en Postgres, las queries INSERT deben tener 'RETURNING id'
    // server.js deberá ser ajustado ligeramente o el adaptador debe inyectarlo.
    // Inyección automática simple:
    const originalRun = db.run;
    db.run = function (sql, params, callback) {
        if (sql.trim().toUpperCase().startsWith('INSERT') && !sql.toUpperCase().includes('RETURNING')) {
            sql += ' RETURNING id';
        }
        originalRun(sql, params, callback);
    };

} else {
    // Entorno Local (SQLite)
    console.log('Entorno Local: Usando SQLite...');
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.resolve(__dirname, 'poems.db');
    db = new sqlite3.Database(dbPath);

    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS poems (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            poem_id INTEGER NOT NULL,
            author TEXT NOT NULL,
            email TEXT,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (poem_id) REFERENCES poems (id)
        )`);
    });
}

module.exports = db;
