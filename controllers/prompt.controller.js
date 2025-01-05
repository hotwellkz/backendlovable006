import { initOpenAI } from '../utils/openai.js';
import { supabase } from '../config/supabase.js';
import os from 'os';

export const handlePrompt = async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Расширенное логирование системных ресурсов
    const systemInfo = {
      freeMem: (os.freemem() / 1024 / 1024).toFixed(2) + ' MB',
      totalMem: (os.totalmem() / 1024 / 1024).toFixed(2) + ' MB',
      cpuLoad: os.loadavg(),
      uptime: os.uptime(),
      platform: os.platform(),
      arch: os.arch()
    };
    
    console.log('Системная информация:', systemInfo);

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Ошибка авторизации:', { 
        header: authHeader,
        timestamp: new Date().toISOString()
      });
      return res.status(401).json({ 
        error: 'Некорректный формат заголовка авторизации',
        details: 'Требуется заголовок в формате: Bearer <token>'
      });
    }

    const token = authHeader.split(' ')[1];
    console.log('Получен токен:', {
      tokenPreview: token.substring(0, 10) + '...',
      timestamp: new Date().toISOString()
    });

    const requestInfo = {
      method: req.method,
      path: req.path,
      headers: {
        ...req.headers,
        authorization: 'Bearer [HIDDEN]'
      },
      body: {
        ...req.body,
        prompt: req.body.prompt?.substring(0, 100) + '...'
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('Детали запроса:', requestInfo);

    const { prompt, framework, userId } = req.body;

    if (!prompt || !framework || !userId) {
      const missingParams = {
        prompt: !prompt,
        framework: !framework,
        userId: !userId
      };
      console.error('Отсутствуют параметры:', missingParams);
      return res.status(400).json({ 
        error: 'Отсутствуют обязательные параметры',
        details: missingParams
      });
    }

    // Проверка токена через Supabase с расширенным логированием
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Ошибка проверки токена:', {
        error: authError,
        token: token.substring(0, 10) + '...',
        timestamp: new Date().toISOString()
      });
      return res.status(401).json({ 
        error: 'Недействительный токен авторизации',
        details: authError?.message
      });
    }

    if (user.id !== userId) {
      console.error('Несоответствие ID пользователя:', {
        requestUserId: userId,
        tokenUserId: user.id,
        timestamp: new Date().toISOString()
      });
      return res.status(403).json({ 
        error: 'Доступ запрещен',
        details: 'ID пользователя не соответствует токену'
      });
    }

    // Инициализация OpenAI с отслеживанием времени
    console.time('openai_init');
    const openai = await initOpenAI();
    console.timeEnd('openai_init');

    if (!openai) {
      console.error('Ошибка инициализации OpenAI');
      return res.status(500).json({ 
        error: 'Ошибка инициализации OpenAI',
        details: 'Не удалось создать клиент OpenAI'
      });
    }

    // Сохранение промпта пользователя
    const { error: chatError } = await supabase
      .from('chat_history')
      .insert({
        user_id: userId,
        prompt,
        is_ai: false,
        timestamp: new Date().toISOString(),
      });

    if (chatError) {
      console.error('Ошибка сохранения в chat_history:', {
        error: chatError,
        userId,
        timestamp: new Date().toISOString()
      });
      return res.status(500).json({ 
        error: 'Ошибка при сохранении в базу данных',
        details: chatError.message
      });
    }

    // Формирование системного промпта с учетом фреймворка
    const frameworkPrompts = {
      react: " You specialize in creating React applications with TypeScript, React Router, and Tailwind CSS.",
      node: " You specialize in creating Node.js applications with Express.js, MongoDB/Mongoose, and JWT authentication.",
      vue: " You specialize in creating Vue.js applications with TypeScript, Vue Router, and Vuex."
    };

    const systemPrompt = `You are a helpful assistant that generates structured responses for code generation. 
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
    }${frameworkPrompts[framework] || ''}`;

    console.log('Отправка запроса к OpenAI:', {
      model: "gpt-4",
      promptLength: prompt.length,
      framework,
      timestamp: new Date().toISOString()
    });

    // Запрос к OpenAI с отслеживанием времени
    console.time('openai_request');
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });
    console.timeEnd('openai_request');

    if (!completion.choices?.[0]?.message?.content) {
      console.error('Некорректный ответ от OpenAI:', completion);
      return res.status(500).json({ 
        error: 'Некорректный ответ от OpenAI API',
        details: 'Отсутствует содержимое ответа'
      });
    }

    const aiMessage = completion.choices[0].message.content;
    console.log('Получен ответ от OpenAI длиной:', aiMessage.length);

    let response;
    try {
      response = JSON.parse(aiMessage);
    } catch (error) {
      console.error('Ошибка парсинга JSON:', {
        error,
        aiMessage: aiMessage.substring(0, 100) + '...'
      });
      return res.status(500).json({ 
        error: 'Некорректный формат ответа от OpenAI',
        details: error.message
      });
    }

    // Сохранение ответа ИИ
    const { error: aiChatError } = await supabase
      .from('chat_history')
      .insert({
        user_id: userId,
        prompt: response.description,
        is_ai: true,
        timestamp: new Date().toISOString(),
      });

    if (aiChatError) {
      console.error('Ошибка сохранения ответа ИИ:', {
        error: aiChatError,
        userId,
        timestamp: new Date().toISOString()
      });
      return res.status(500).json({ 
        error: 'Ошибка при сохранении ответа в базу данных',
        details: aiChatError.message
      });
    }

    const executionTime = Date.now() - startTime;
    console.log('Запрос успешно обработан:', {
      userId,
      framework,
      executionTime: executionTime + 'ms',
      promptLength: prompt.length,
      responseLength: JSON.stringify(response).length,
      timestamp: new Date().toISOString()
    });

    res.json({
      ...response,
      success: true,
      executionTime
    });
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('Критическая ошибка:', {
      error: error.message,
      stack: error.stack,
      executionTime: executionTime + 'ms',
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      error: 'Ошибка при обработке запроса',
      details: error.message,
      executionTime
    });
  }
};
