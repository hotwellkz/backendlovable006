import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/api.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Настройки CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [
        'https://lovable.dev',
        'https://www.lovable.dev',
        'https://lovable006.netlify.app',
        'https://backendlovable006.onrender.com',
        'https://lovable.dev/projects/671f63f8-d15e-4c5b-beea-9ea6ba6a0ea0'
      ]
    : ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400
};

// Настройка CORS для разрешения запросов с фронтенда
app.use(cors(corsOptions));

// Добавляем промежуточное ПО для обработки preflight запросов
app.options('*', cors(corsOptions));

// Настройка для обработки JSON-запросов
app.use(express.json());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, 'uploads');

// Подключаем маршруты API
app.use('/api', apiRoutes);

// Статические файлы
app.use('/uploads', express.static(uploadsDir));

// Маршрут для проверки работоспособности
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Запуск сервера
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});
