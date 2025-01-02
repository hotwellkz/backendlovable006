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
    ? ['https://your-frontend-url.vercel.app'] // Замените на URL вашего фронтенда
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());

// ... keep existing code (OpenAI configuration and file handling)

// Добавляем маршрут для проверки работоспособности
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});
