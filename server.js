const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());
// Serve static files from the project directory
app.use(express.static(path.join(__dirname)));

const JWT_SECRET = 'kanban-super-secret-key-2026';
let db;

// Inicializa Banco de Dados
async function initDB() {
    db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            passwordHash TEXT NOT NULL,
            createdAt TEXT,
            updatedAt TEXT,
            lastLoginAt TEXT
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL,
            deadline TEXT,
            completed BOOLEAN NOT NULL CHECK (completed IN (0, 1)),
            createdAt TEXT,
            updatedAt TEXT,
            completedAt TEXT,
            FOREIGN KEY(userId) REFERENCES users(id)
        );
    `);
}

// Middleware de Autenticação
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ message: 'Acesso negado' });
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Sessão expirada ou inválida.' });
        req.user = user;
        next();
    });
}

// ==================== ROTAS DE AUTENTICAÇÃO ==================== //

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existing = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (existing) return res.status(400).json({ message: 'E-mail já cadastrado' });

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const now = new Date().toISOString();
        const id = crypto.randomUUID();

        await db.run(
            'INSERT INTO users (id, name, email, passwordHash, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
            [id, name, email, passwordHash, now, now]
        );

        // Tarefas de exemplo
        const d1 = new Date(); d1.setDate(d1.getDate() + 2);
        const d2 = new Date(); d2.setDate(d2.getDate() - 1);
        
        const tasks = [
            { id: crypto.randomUUID(), title: "Bem-vindo ao Kanban", description: "Experimente arrastar este card.", status: "todo", deadline: d1.toISOString().split('T')[0] },
            { id: crypto.randomUUID(), title: "Tarefa Atrasada", description: "Esta tarefa mostra o estilo de atraso automático.", status: "todo", deadline: d2.toISOString().split('T')[0] },
            { id: crypto.randomUUID(), title: "Arquitetura Simétrica", description: "Avaliar isolamento de dados no localstorage.", status: "doing", deadline: d1.toISOString().split('T')[0] }
        ];

        for(const t of tasks) {
            await db.run(
                'INSERT INTO tasks (id, userId, title, description, status, deadline, completed, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [t.id, id, t.title, t.description, t.status, t.deadline, 0, now, now]
            );
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) return res.status(401).json({ message: 'Credenciais inválidas' });

        const validPass = await bcrypt.compare(password, user.passwordHash);
        if (!validPass) return res.status(401).json({ message: 'Credenciais inválidas' });

        const now = new Date().toISOString();
        await db.run('UPDATE users SET lastLoginAt = ? WHERE id = ?', [now, user.id]);

        const token = jwt.sign({ userId: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ==================== ROTAS DE USUÁRIO ==================== //

// GET /api/users/me
app.get('/api/users/me', authenticateToken, async (req, res) => {
    try {
        const user = await db.get('SELECT id, name, email, createdAt, updatedAt, lastLoginAt FROM users WHERE id = ?', [req.user.userId]);
        if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/users/me
app.put('/api/users/me', authenticateToken, async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existing = await db.get('SELECT * FROM users WHERE email = ? AND id != ?', [email, req.user.userId]);
        if (existing) return res.status(400).json({ message: 'E-mail já está em uso' });

        const now = new Date().toISOString();
        if (password) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);
            await db.run('UPDATE users SET name = ?, email = ?, passwordHash = ?, updatedAt = ? WHERE id = ?', [name, email, passwordHash, now, req.user.userId]);
        } else {
            await db.run('UPDATE users SET name = ?, email = ?, updatedAt = ? WHERE id = ?', [name, email, now, req.user.userId]);
        }

        const user = await db.get('SELECT id, name, email FROM users WHERE id = ?', [req.user.userId]);
        const token = jwt.sign({ userId: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ user, token });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ==================== ROTAS DE TAREFAS ==================== //

// GET /api/tasks
app.get('/api/tasks', authenticateToken, async (req, res) => {
    try {
        const tasks = await db.all('SELECT * FROM tasks WHERE userId = ?', [req.user.userId]);
        tasks.forEach(t => t.completed = !!t.completed); // Converte de volta para boolean (SQLite salva como 0/1)
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/tasks
app.post('/api/tasks', authenticateToken, async (req, res) => {
    try {
        const { title, description, status, deadline } = req.body;
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        await db.run(
            'INSERT INTO tasks (id, userId, title, description, status, deadline, completed, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)',
            [id, req.user.userId, title, description || '', status, deadline, now, now]
        );

        const newTask = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
        newTask.completed = false;
        res.json(newTask);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/tasks/:id
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const task = await db.get('SELECT * FROM tasks WHERE id = ? AND userId = ?', [id, req.user.userId]);
        if (!task) return res.status(404).json({ message: 'Não encontrado' });

        const now = new Date().toISOString();
        let query = 'UPDATE tasks SET updatedAt = ?';
        let params = [now];

        for(const field of ['title', 'description', 'status', 'deadline']) {
            if(req.body[field] !== undefined) {
                query += `, ${field} = ?`;
                params.push(req.body[field]);
            }
        }

        if(req.body.completed !== undefined) {
            const completedInt = req.body.completed ? 1 : 0;
            query += `, completed = ?`;
            params.push(completedInt);
            
            if(req.body.completed === true && !task.completed) {
                query += `, completedAt = ?`;
                params.push(now);
            } else if (req.body.completed === false) {
                query += `, completedAt = NULL`;
            }
        }

        query += ' WHERE id = ? AND userId = ?';
        params.push(id, req.user.userId);

        await db.run(query, params);

        const updated = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
        updated.completed = !!updated.completed;
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/tasks/:id
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.run('DELETE FROM tasks WHERE id = ? AND userId = ?', [id, req.user.userId]);
        if (result.changes === 0) return res.status(404).json({ message: 'Não encontrado' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Fallback principal (Carrega o Frontend)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'kanban.html'));
});

// ==================== INICIALIZAÇÃO ==================== //

const PORT = process.env.PORT || 3000;
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    });
}).catch(console.error);
