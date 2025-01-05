import { initOpenAI } from '../utils/openai.js';
import { supabase } from '../config/supabase.js';
import path from 'path';

export const handlePrompt = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.error('Отсутствует заголовок авторизации. Заголовки:', req.headers);
      return res.status(401).json({ error: 'Необходима авторизация' });
    }

    console.log(`[${new Date().toISOString()}] Получен запрос:`, req.body);
    const { prompt, framework, userId } = req.body;

    if (!prompt || !framework || !userId) {
      console.error('Отсутствуют обязательные параметры:', { prompt, framework, userId });
      return res.status(400).json({ error: 'Отсутствуют обязательные параметры' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Ошибка авторизации:', authError);
      return res.status(401).json({ error: 'Недействительный токен авторизации' });
    }

    if (user.id !== userId) {
      console.error('Несоответствие userId');
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const openai = await initOpenAI();
    if (!openai) {
      console.error('Не удалось инициализировать OpenAI');
      return res.status(500).json({ error: 'Ошибка инициализации OpenAI' });
    }

    console.log('Сохраняем промпт в историю чата...');
    const { error: chatError } = await supabase
      .from('chat_history')
      .insert({
        user_id: userId,
        prompt,
        is_ai: false,
      });

    if (chatError) {
      console.error('Ошибка при сохранении в chat_history:', chatError);
      return res.status(500).json({ error: 'Ошибка при сохранении в базу данных' });
    }

    const frameworkPrompts = {
      react: "You specialize in creating React applications with TypeScript, React Router, and Tailwind CSS.",
      node: "You specialize in creating Node.js applications with Express.js, MongoDB/Mongoose, and JWT authentication.",
      vue: "You specialize in creating Vue.js applications with TypeScript, Vue Router, and Vuex.",
    };

    let systemPrompt = `You are a helpful assistant that generates structured responses for code generation. Your response must always be in JSON format:
    {
      "files": [
        { "path": "relative/path/to/file.ext", "content": "file content here", "type": "create|update|delete" }
      ],
      "description": "Detailed explanation of changes",
      "dependencies": ["package1", "package2"]
    } ${frameworkPrompts[framework] || ''}`;

    console.log('Отправляем запрос к OpenAI...');
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      if (!completion.choices || !completion.choices[0] || !completion.choices[0].message) {
        console.error('Некорректный ответ от OpenAI API:', completion);
        return res.status(500).json({ error: 'Некорректный ответ от OpenAI API' });
      }

      let response;
      try {
        response = JSON.parse(completion.choices[0].message.content);
        console.log('Получен ответ от OpenAI:', response);
      } catch (error) {
        console.error('Ошибка парсинга JSON ответа:', error);
        return res.status(500).json({ error: 'Некорректный формат ответа от OpenAI' });
      }

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
        return res.status(500).json({ error: 'Ошибка при сохранении ответа в базу данных' });
      }

      console.log('Успешно обработан запрос');
      res.json({ ...response, success: true });
    } catch (openAiError) {
      console.error('Ошибка при запросе к OpenAI:', openAiError);
      return res.status(500).json({ error: 'Ошибка при запросе к OpenAI', details: openAiError.message });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Ошибка при обработке запроса', details: error.message });
  }
};
