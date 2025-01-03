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

if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY не установлен в переменных окружения');
}

// Функция для развертывания проекта
const deployProject = async (userId, files, framework) => {
  try {
    const projectDir = path.join(uploadsDir, userId);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    for (const file of files) {
      const filePath = path.join(projectDir, file.path);
      const fileDir = path.dirname(filePath);

      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      fs.writeFileSync(filePath, file.content);
    }

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

    if (!prompt || !framework || !userId) {
      return res.status(400).json({ error: 'Отсутствуют обязательные параметры' });
    }

    const { error: chatError } = await supabase
      .from('chat_history')
      .insert({
        user_id: userId,
        prompt: prompt,
        is_ai: false
      });

    if (chatError) {
      console.error('Ошибка при сохранении в chat_history:', chatError);
      throw chatError;
    }

    let systemPrompt = "You are a helpful assistant that generates structured responses for code generation. ";
    switch (framework) {
      case "react":
        systemPrompt += "You specialize in creating React applications with TypeScript, React Router, and Tailwind CSS. ";
        break;
      case "node":
        systemPrompt += "You specialize in creating Node.js applications with Express.js, MongoDB/Mongoose, and JWT authentication. ";
        break;
      case "vue":
        systemPrompt += "You specialize in creating Vue.js applications with TypeScript, Vue Router, and Vuex. ";
        break;
    }
    systemPrompt += "Always return response in JSON format with fields: files (array of file objects with path and content), description (string with explanation).";

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
    });

    if (!completion.choices || !completion.choices[0] || !completion.choices[0].message) {
      throw new Error('Некорректный ответ от OpenAI API');
    }

    const response = JSON.parse(completion.choices[0].message.content);

    if (response.files && response.files.length > 0) {
      for (const file of response.files) {
        const filePath = `${userId}/${file.path}`;

        const { error: uploadError } = await supabase.storage
          .from('project_files')
          .upload(filePath, file.content, {
            contentType: 'text/plain',
            upsert: true
          });

        if (uploadError) {
          console.error('Ошибка при загрузке файла в Storage:', uploadError);
          throw uploadError;
        }

        const { error: fileError } = await supabase
          .from('files')
          .insert({
            user_id: userId,
            filename: path.basename(file.path),
            file_path: filePath,
            content_type: 'text/plain',
            size: Buffer.byteLength(file.content, 'utf8'),
            content: file.content
          });

        if (fileError) {
          console.error('Ошибка при сохранении метаданных файла:', fileError);
          throw fileError;
        }
      }
    }

    const { error: aiChatError } = await supabase
      .from('chat_history')
      .insert({
        user_id: userId,
        prompt: response.description,
        is_ai: true
      });

    if (aiChatError) {
      console.error('Ошибка при сохранении ответа ИИ в chat_history:', aiChatError);
      throw aiChatError;
    }

    res.json(response);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Ошибка при обработке запроса',
      details: error.message 
    });
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
}`
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
