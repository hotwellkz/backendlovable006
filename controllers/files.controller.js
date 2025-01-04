import { initOpenAI } from '../utils/openai.js';
import { supabase } from '../config/supabase.js';
import path from 'path';

export const handlePrompt = async (req, res) => {
  try {
    console.log('Получен запрос:', req.body);
    const { prompt, framework, userId } = req.body;

    if (!prompt || !framework || !userId) {
      console.error('Отсутствуют обязательные параметры:', { prompt, framework, userId });
      return res.status(400).json({ error: 'Отсутствуют обязательные параметры' });
    }

    // Инициализируем OpenAI
    const openai = await initOpenAI();
    if (!openai) {
      console.error('Не удалось инициализировать OpenAI');
      return res.status(500).json({ error: 'Ошибка инициализации OpenAI' });
    }

    console.log('Сохраняем промпт в историю чата...');
    // Сохраняем промпт в историю чата
    const { error: chatError } = await supabase
      .from('chat_history')
      .insert({
        user_id: userId,
        prompt,
        is_ai: false,
      });

    if (chatError) {
      console.error('Ошибка при сохранении в chat_history:', chatError);
      throw chatError;
    }

    // Формируем системный промт в зависимости от фреймворка
    let systemPrompt = `You are a helpful assistant that generates structured responses for code generation. 
    Your response must always be in the following JSON format:
    {
      "files": [
        {
          "path": "relative/path/to/file.ext",
          "content": "file content here",
          "type": "create|update|delete"
        }
      ],
      "description": "Detailed explanation of changes",
      "dependencies": ["package1", "package2"],
      "containerConfig": {
        "port": number,
        "env": ["KEY=value"]
      }
    }`;

    switch (framework) {
      case 'react':
        systemPrompt += "You specialize in creating React applications with TypeScript, React Router, and Tailwind CSS. ";
        break;
      case 'node':
        systemPrompt += "You specialize in creating Node.js applications with Express.js, MongoDB/Mongoose, and JWT authentication. ";
        break;
      case 'vue':
        systemPrompt += "You specialize in creating Vue.js applications with TypeScript, Vue Router, and Vuex. ";
        break;
    }

    console.log('Отправляем запрос к OpenAI...');
    // Получаем ответ от OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    if (!completion.choices || !completion.choices[0] || !completion.choices[0].message) {
      console.error('Некорректный ответ от OpenAI API');
      throw new Error('Некорректный ответ от OpenAI API');
    }

    let response;
    try {
      response = JSON.parse(completion.choices[0].message.content);
      console.log('Получен ответ от OpenAI:', response);
    } catch (error) {
      console.error('Ошибка парсинга JSON ответа:', error);
      throw new Error('Некорректный формат ответа от OpenAI');
    }

    // Валидация структуры ответа
    if (!response.files || !Array.isArray(response.files) || !response.description) {
      throw new Error('Некорректная структура ответа от OpenAI');
    }

    // Сохраняем файлы
    if (response.files.length > 0) {
      console.log('Сохраняем файлы...');
      for (const file of response.files) {
        if (!file.path || !file.content) {
          console.error('Некорректная структура файла:', file);
          continue;
        }

        const filePath = `${userId}/${file.path}`;

        if (file.type === 'delete') {
          const { error: deleteError } = await supabase.storage
            .from('project_files')
            .remove([filePath]);

          if (deleteError) {
            console.error('Ошибка при удалении файла:', deleteError);
            continue;
          }
        } else {
          const { error: uploadError } = await supabase.storage
            .from('project_files')
            .upload(filePath, file.content, {
              contentType: 'text/plain',
              upsert: true,
            });

          if (uploadError) {
            console.error('Ошибка при загрузке файла в Storage:', uploadError);
            continue;
          }

          const { error: fileError } = await supabase
            .from('files')
            .insert({
              user_id: userId,
              filename: path.basename(file.path),
              file_path: filePath,
              content_type: 'text/plain',
              size: Buffer.byteLength(file.content, 'utf8'),
              content: file.content,
            });

          if (fileError) {
            console.error('Ошибка при сохранении метаданных файла:', fileError);
            continue;
          }
        }
      }
    }

    // Сохраняем ответ ИИ в историю чата
    console.log('Сохраняем ответ ИИ в историю чата...');
    const { error: aiChatError } = await supabase
      .from('chat_history')
      .insert({
        user_id: userId,
        prompt: response.description,
        is_ai: true,
      });

    if (aiChatError) {
      console.error('Ошибка при сохранении ответа ИИ в chat_history:', aiChatError);
      throw aiChatError;
    }

    console.log('Успешно обработан запрос');
    res.json({
      ...response,
      success: true,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Ошибка при обработке запроса',
      details: error.message,
    });
  }
};
