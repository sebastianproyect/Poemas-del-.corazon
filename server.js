const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Clave secreta para "Admin"
const ADMIN_PASSWORD = "azul_profundo";

// --- Rutas API ---

// 1. Obtener todos los poemas
app.get('/api/poems', (req, res) => {
    const sql = "SELECT * FROM poems ORDER BY created_at DESC";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "success", data: rows });
    });
});

// 2. Obtener un poema por ID (con comentarios)
app.get('/api/poems/:id', (req, res) => {
    const sqlPoem = "SELECT * FROM poems WHERE id = ?";
    const sqlComments = "SELECT * FROM comments WHERE poem_id = ? ORDER BY created_at DESC";

    db.get(sqlPoem, [req.params.id], (err, poem) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!poem) return res.status(404).json({ error: "Poema no encontrado" });

        db.all(sqlComments, [req.params.id], (err, comments) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "success", data: { ...poem, comments } });
        });
    });
});

// 3. Crear nuevo poema (Admin)
app.post('/api/poems', (req, res) => {
    const { title, content, password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(403).json({ error: "No autorizado." });

    const sql = 'INSERT INTO poems (title, content) VALUES (?,?)';
    db.run(sql, [title, content], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "success", id: this.lastID });
    });
});

// 4. Agregar comentario (Con validación de Email Único)
app.post('/api/comments', (req, res) => {
    const { poem_id, author, email, content } = req.body;

    // Validación básica
    if (!poem_id || !author || !content) {
        return res.status(400).json({ error: "Faltan datos requeridos." });
    }

    // Verificar si ya existe comentario con ese email en este poema (si se proporciona email)
    if (email) {
        db.get("SELECT id FROM comments WHERE poem_id = ? AND email = ?", [poem_id, email], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });

            if (row) {
                return res.status(403).json({ error: "Ya has dejado una huella en esta obra. ✨" });
            } else {
                insertComment();
            }
        });
    } else {
        // Permitir comentario sin email si se desea (aunque el frontend lo pide)
        // Ojo: Si el usuario borró el required en HTML.
        insertComment();
    }

    function insertComment() {
        const sql = 'INSERT INTO comments (poem_id, author, email, content) VALUES (?,?,?,?)';
        db.run(sql, [poem_id, author, email, content], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "success", id: this.lastID });
        });
    }
});

// 5. Verificar Login
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) res.json({ success: true });
    else res.status(403).json({ success: false, error: "Contraseña incorrecta" });
});

// 6. Eliminar Poema (Admin)
app.post('/api/poems/delete', (req, res) => {
    const { id, password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(403).json({ error: "No autorizado." });

    db.run("DELETE FROM comments WHERE poem_id = ?", [id], (err) => {
        db.run("DELETE FROM poems WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// 7. Editar Poema (Admin)
app.post('/api/poems/edit', (req, res) => {
    const { id, title, content, password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(403).json({ error: "No autorizado." });

    const sql = "UPDATE poems SET title = ?, content = ? WHERE id = ?";
    db.run(sql, [title, content, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// 8. Eliminar Comentario (Admin)
app.post('/api/comments/delete', (req, res) => {
    const { id, password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(403).json({ error: "No autorizado." });

    db.run("DELETE FROM comments WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Debug Endpoint (Para verificar si detecta Postgres)
app.get('/api/debug-status', (req, res) => {
    res.json({
        node_env: process.env.NODE_ENV,
        has_postgres_url: !!process.env.POSTGRES_URL,
        postgres_url_start: process.env.POSTGRES_URL ? process.env.POSTGRES_URL.substring(0, 10) + '...' : 'N/A',
        db_type: process.env.POSTGRES_URL ? 'Postgres' : 'SQLite Check Failed - Still using SQLite'
    });
});

// 9. Manejo de Errores y 404 para API
app.all('/api/{*path}', (req, res) => {
    res.status(404).json({ error: "Endpoint de API no encontrado." });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Error interno del servidor", details: err.message });
});

// Fallback - SPA (Solo para rutas no-API)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
}

module.exports = app;
