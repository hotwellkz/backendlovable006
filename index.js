import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { corsOptions } from './config/cors.js';
import apiRoutes from './routes/api.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Включаем CORS до всех остальных middleware
app.use(cors(corsOptions));

// Добавляем промежуточное ПО для обработки preflight запросов
app.options('*', cors(corsOptions));

// Добавляем middleware для парсинга JSON
app.use(express.json());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, 'uploads');

// Подключаем маршруты API
app.use('/api', apiRoutes);

// Статические файлы
app.use('/uploads', express.static(uploadsDir));

// Корневой маршрут
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Lovable Backend API',
    version: '1.0.0',
    docs: 'https://docs.lovable.dev'
  });
});

// Маршрут для проверки работоспособности
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Обработка 404 ошибок
app.use((req, res, next) => {
  console.log(`404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ 
    error: 'Маршрут не найден',
    path: req.url,
    method: req.method
  });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Ошибка сервера:', err);
  res.status(500).json({ 
    error: 'Внутренняя ошибка сервера',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});
