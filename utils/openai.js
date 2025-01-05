import OpenAI from 'openai';
import { supabase } from '../config/supabase.js';

// Функция для получения API ключа из Supabase с повторными попытками
const getOpenAIKey = async (retryCount = 3) => {
  for (let i = 0; i < retryCount; i++) {
    try {
      console.log(`Попытка ${i + 1} получения API ключа OpenAI из Supabase...`);
      
      // Проверяем подключение к Supabase
      const { error: testError } = await supabase
        .from('secrets')
        .select('*')
        .limit(1);
      
      if (testError) {
        console.error('Ошибка подключения к Supabase:', testError);
        if (i === retryCount - 1) throw testError;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }

      // Получаем API ключ
      const { data, error } = await supabase
        .from('secrets')
        .select('value')
        .eq('name', 'OPENAI_API_KEY')
        .single();

      if (error) {
        console.error(`Попытка ${i + 1}: Ошибка при получении API ключа:`, error);
        if (i === retryCount - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      
      if (!data?.value) {
        console.error(`Попытка ${i + 1}: API ключ не найден в таблице secrets`);
        throw new Error('API ключ OpenAI не найден в базе данных');
      }

      console.log('API ключ OpenAI успешно получен');
      return data.value;
    } catch (error) {
      console.error(`Попытка ${i + 1}: Критическая ошибка при получении API ключа:`, {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      if (i === retryCount - 1) {
        throw new Error(`Не удалось получить API ключ OpenAI после ${retryCount} попыток: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};

// Инициализация OpenAI с ключом из Supabase и повторными попытками
let openai = null;
export const initOpenAI = async (retryCount = 3) => {
  try {
    if (!openai) {
      console.log('Инициализация клиента OpenAI...');
      const apiKey = await getOpenAIKey(retryCount);
      
      if (!apiKey) {
        throw new Error('Не удалось получить действительный API ключ OpenAI');
      }

      openai = new OpenAI({ 
        apiKey,
        timeout: 30000, // 30 секунд таймаут для всех запросов
        maxRetries: 2 // Максимальное количество повторных попыток
      });
      
      console.log('Клиент OpenAI успешно инициализирован');
    }
    return openai;
  } catch (error) {
    console.error('Ошибка при инициализации клиента OpenAI:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const processPrompt = async (prompt) => {
  try {
    const client = await initOpenAI();
    
    console.log('Отправка запроса к OpenAI...');
    const completion = await client.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
    });

    console.log('Ответ успешно получен от OpenAI');
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Ошибка при обработке промпта:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};
