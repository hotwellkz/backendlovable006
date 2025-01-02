import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Настройка CORS для разрешения запросов с фронтенда
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://lovable.dev', 'https://www.lovable.dev'] 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

// ... keep existing code (middleware setup and OpenAI initialization)

// ... keep existing code (file handling functions and routes)

app.use('/uploads', express.static(uploadsDir));

// Добавляем маршрут для проверки работоспособности
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});
