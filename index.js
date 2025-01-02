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

// Настройка CORS для разрешения запросов с фронтенда
app.use(cors(corsOptions));

// Добавляем промежуточное ПО для обработки preflight запросов
app.options('*', cors(corsOptions));

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

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});
