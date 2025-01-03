import { createClient } from '@supabase/supabase-js';
import { initOpenAI } from '../utils/openai.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handlePrompt = async (req, res) => {
  try {
    const openai = await initOpenAI();
    const { prompt, framework, userId } = req.body;

    if (!prompt || !framework || !userId) {
      return res.status(400).json({ error: 'Отсутствуют обязательные параметры' });
    }

    // Сохраняем промпт в историю чата
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

    // Формируем системный промт в зависимости от фреймворка
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

    // Получаем ответ от OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        { role: "user", content: prompt }
      ],
    });

    if (!completion.choices || !completion.choices[0] || !completion.choices[0].message) {
      throw new Error('Некорректный ответ от OpenAI API');
    }

    const response = JSON.parse(completion.choices[0].message.content);

    // Сохраняем ответ ИИ в историю чата
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
