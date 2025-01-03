import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Настройка директорий
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'uploads');

// Настройка OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Настройка Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handlePrompt = async (req, res) => {
  try {
    const { prompt, userId } = req.body;
    if (!prompt || !userId) {
      throw new Error('Prompt and userId are required');
    }

    // Сохраняем промт пользователя в историю чата
    const { error: chatError } = await supabase
      .from('chat_history')
      .insert({
        user_id: userId,
        prompt: prompt,
        is_ai: false
      });

    if (chatError) throw chatError;

    // Отправляем запрос к OpenAI
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

    const response = JSON.parse(completion.choices[0].message.content);

    // Сохраняем файлы в Supabase Storage
    if (response.files && response.files.length > 0) {
      for (const file of response.files) {
        const filePath = `${userId}/${file.path}`;
        const contentBuffer = Buffer.from(file.content);

        // Загружаем файл в storage
        const { error: uploadError } = await supabase.storage
          .from('project_files')
          .upload(filePath, contentBuffer, {
            contentType: 'text/plain',
            upsert: true
          });

        if (uploadError) throw uploadError;

        // Сохраняем метаданные файла в базу данных
        const { error: dbError } = await supabase
          .from('files')
          .insert({
            user_id: userId,
            filename: path.basename(file.path),
            file_path: filePath,
            content_type: 'text/plain',
            size: contentBuffer.length
          });

        if (dbError) throw dbError;
      }
    }

    // Сохраняем ответ ИИ в историю чата
    const { error: aiChatError } = await supabase
      .from('chat_history')
      .insert({
        user_id: userId,
        prompt: response.description,
        is_ai: true
      });

    if (aiChatError) throw aiChatError;

    res.json({
      success: true,
      message: 'Files created and saved successfully',
      description: response.description
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process prompt',
      details: error.message 
    });
  }
};

// Сохраняем существующий код (handleUpdateFiles и handleFiles)
export const handleUpdateFiles = async (req, res) => {
  try {
    const { prompt } = req.body;
    const currentFiles = readDirectory(uploadsDir);

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

    const response = JSON.parse(completion.choices[0].message.content);

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
};

export const handleFiles = async (req, res) => {
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
};

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
