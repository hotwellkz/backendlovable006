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

// Функция для развертывания проекта
const deployProject = async (userId, files, framework) => {
  try {
    // Создаем временную директорию для проекта
    const projectDir = path.join(uploadsDir, userId);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    // Записываем файлы
    for (const file of files) {
      const filePath = path.join(projectDir, file.path);
      const fileDir = path.dirname(filePath);

      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      fs.writeFileSync(filePath, file.content);
    }

    // Обновляем статус развертывания в базе данных
    const { data, error } = await supabase
      .from('deployed_projects')
      .upsert({
        user_id: userId,
        status: 'deployed',
        framework,
        project_url: `/preview/${userId}`,
        last_deployment: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Deployment error:', error);
    throw error;
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

export const handlePrompt = async (req, res) => {
  try {
    const { prompt, framework, userId } = req.body;

    if (!prompt || !userId) {
      return res.status(400).json({ error: 'Prompt and userId are required' });
    }

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

    if (response.files && response.files.length > 0) {
      // Сохраняем файлы и разворачиваем проект
      const deploymentResult = await deployProject(userId, response.files, framework);

      // Сохраняем историю чата
      await supabase
        .from('chat_history')
        .insert({
          user_id: userId,
          prompt,
          response: JSON.stringify(response),
          is_ai: true
        });

      res.json({
        ...response,
        deployment: deploymentResult
      });
    } else {
      res.json(response);
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to process prompt' });
  }
};

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
