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

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Функция для чтения содержимого директории
const readDirectory = (directory) => {
  const files = [];
  const items = fs.readdirSync(directory);
  
  for (const item of items) {
    const itemPath = path.join(directory, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      files.push(...readDirectory(itemPath));
    } else {
      files.push({
        path: path.relative(uploadsDir, itemPath),
        content: fs.readFileSync(itemPath, 'utf8'),
      });
    }
  }
  
  return files;
};

// Маршрут для обновления файлов
app.post('/api/update-files', async (req, res) => {
  try {
    const { prompt } = req.body;

    // Читаем текущие файлы
    const currentFiles = readDirectory(uploadsDir);

    // Формируем запрос к OpenAI с учетом текущих файлов
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that analyzes and modifies code files. Return response in JSON format with fields: files (array of file objects with action, path and content), description (string with explanation)."
        },
        {
          role: "user",
          content: `
Current project files:
${currentFiles.map(file => `File: ${file.path}\nContent:\n${file.content}`).join('\n\n')}

User request:
${prompt}

Please analyze these files and provide necessary updates. Return response in the following format:
{
  "files": [
    {
      "action": "update" | "add" | "delete",
      "path": "file_path",
      "content": "file_content" // only for add or update actions
    }
  ],
  "description": "Description of changes made"
}
`
        }
      ],
    });

    // Парсим ответ от OpenAI
    const response = JSON.parse(completion.choices[0].message.content);

    // Применяем изменения к файлам
    for (const file of response.files) {
      const filePath = path.join(uploadsDir, file.path);
      
      if (file.action === 'delete') {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } else if (file.action === 'add' || file.action === 'update') {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, file.content);
      }
    }

    res.json({
      success: true,
      message: 'Files updated successfully',
      description: response.description
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update files',
      details: error.message 
    });
  }
});

// Существующие маршруты
app.post('/api/prompt', async (req, res) => {
  try {
    const { prompt, framework } = req.body;

    // Формируем системный промт для получения структурированного ответа
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates structured responses for code generation. Always return response in JSON format with fields: files (array of file objects with path and content), description (string with explanation)."
        },
        { role: "user", content: prompt }
      ],
    });

    // Парсим ответ от OpenAI
    const response = JSON.parse(completion.choices[0].message.content);

    // Если есть файлы для сохранения, сохраняем их
    if (response.files && response.files.length > 0) {
      for (const file of response.files) {
        const filePath = path.join(uploadsDir, file.path);
        const fileDir = path.dirname(filePath);
        
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, file.content);
      }
    }

    res.json(response);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to process prompt' });
  }
});

app.post('/api/files', async (req, res) => {
  try {
    const { files } = req.body;
    const results = [];

    for (const file of files) {
      const filePath = path.join(uploadsDir, file.path);
      const fileDir = path.dirname(filePath);
      
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, file.content);
      
      results.push({
        path: file.path,
        url: `/uploads/${file.path}`
      });
    }

    res.json({ files: results });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to save files' });
  }
});

app.use('/uploads', express.static(uploadsDir));

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});