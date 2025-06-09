import express from 'express';
import dotenv from 'dotenv';
import mainRouter from './routes/users';
import bookRouter from './routes/books';
import pool from './db';
import authController from './controllers/authController';
import sqlInjectionMiddleware from './middleware/sqlInjectionMiddleware';
import authMiddleware from './middleware/authMiddleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(sqlInjectionMiddleware);


// Публичные маршруты
app.post('/register', authController.register);
app.post('/login', authController.login);
app.post('/verify', authController.verify);
app.post('/refresh', authController.refreshToken);
app.post('/logout', authMiddleware, authController.logout);

app.use('/users', mainRouter);
app.use('/books', bookRouter);

// Роут для тестирования БД
app.get('/test-db', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT version()');
    res.json({ postgresVersion: rows[0].version });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});