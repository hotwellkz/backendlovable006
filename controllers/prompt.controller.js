import { initOpenAI } from '../utils/openai.js';
import { supabase } from '../config/supabase.js';
import os from 'os';

export const handlePrompt = async (req, res) => {
  try {
    // Логируем использование системных ресурсов
    console.log('Свободная память:', os.freemem() / 1024 / 1024, 'MB');
    console.log('Загрузка CPU:', os.loadavg());
    console.log('Всего памяти:', os.totalmem() / 1024 / 1024, 'MB');

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Некорректный формат заголовка авторизации');
      return res.status(401).json({ error: 'Некорректный формат заголовка авторизации' });
    }

    const token = authHeader.split(' ')[1];
    console.log('Получен токен авторизации:', token.substring(0, 10) + '...');

    console.log('Получен запрос:', {
      headers: req.headers,
      body: req.body,
      method: req.method
    });

    const { prompt, framework, userId } = req.body;

    if (!prompt || !framework || !userId) {
      console.error('Отсутствуют обязательные параметры:', { prompt, framework, userId });
      return res.status(400).json({ error: 'Отсутствуют обязательные параметры' });
    }

    // Проверяем валидность токена через Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Ошибка авторизации:', authError);
      return res.status(401).json({ error: 'Недействительный токен авторизации' });
    }

    if (user.id !== userId) {
      console.error('Несоответствие userId:', { 
        requestUserId: userId, 
        tokenUserId: user.id 
      });
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    // Инициализируем OpenAI
    const openai = await initOpenAI();
    if (!openai) {
      console.error('Не удалось инициализировать OpenAI');
      return res.status(500).json({ error: 'Ошибка инициализации OpenAI' });
    }

    // Сохраняем промпт пользователя с дополнительной информацией
    const { error: chatError } = await supabase
      .from('chat_history')
      .insert({
        user_id: userId,
        prompt,
        is_ai: false,
        timestamp: new Date().toISOString(),
      });

    if (chatError) {
      console.error('Ошибка при сохранении в chat_history:', chatError);
      return res.status(500).json({ error: 'Ошибка при сохранении в базу данных' });
    }

    // Формируем системный промпт
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
      "dependencies": ["package1", "package2"]
    }`;

    switch (framework) {
      case 'react':
        systemPrompt += " You specialize in creating React applications with TypeScript, React Router, and Tailwind CSS.";
        break;
      case 'node':
        systemPrompt += " You specialize in creating Node.js applications with Express.js, MongoDB/Mongoose, and JWT authentication.";
        break;
      case 'vue':
        systemPrompt += " You specialize in creating Vue.js applications with TypeScript, Vue Router, and Vuex.";
        break;
    }

    console.log('Отправляем запрос к OpenAI с параметрами:', {
      model: "gpt-4",
      systemPrompt,
      userPrompt: prompt,
      timestamp: new Date().toISOString()
    });

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      });

      if (!completion.choices || !completion.choices[0] || !completion.choices[0].message) {
        console.error('Некорректный ответ от OpenAI API:', completion);
        throw new Error('Некорректный ответ от OpenAI API');
      }

      const aiMessage = completion.choices[0].message.content;
      console.log('Получен ответ от OpenAI:', aiMessage);

      let response;
      try {
        response = JSON.parse(aiMessage);
      } catch (error) {
        console.error('Ошибка парсинга JSON ответа:', error);
        throw new Error('Некорректный формат ответа от OpenAI');
      }

      // Сохраняем ответ ИИ с дополнительной информацией
      const { error: aiChatError } = await supabase
        .from('chat_history')
        .insert({
          user_id: userId,
          prompt: response.description,
          is_ai: true,
          timestamp: new Date().toISOString(),
        });

      if (aiChatError) {
        console.error('Ошибка при сохранении ответа ИИ:', aiChatError);
        throw new Error('Ошибка при сохранении ответа в базу данных');
      }

      // Логируем успешное выполнение
      console.log('Запрос успешно обработан:', {
        userId,
        framework,
        promptLength: prompt.length,
        responseLength: JSON.stringify(response).length,
        timestamp: new Date().toISOString()
      });

      res.json({
        ...response,
        success: true
      });
      
    } catch (openAiError) {
      console.error('Ошибка при запросе к OpenAI:', openAiError);
      throw new Error(`Ошибка при запросе к OpenAI: ${openAiError.message}`);
    }
    
  } catch (error) {
    console.error('Критическая ошибка:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      error: 'Ошибка при обработке запроса',
      details: error.message
    });
  }
};
