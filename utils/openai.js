import OpenAI from 'openai';
import { supabase } from '../config/supabase.js';

const getOpenAIKey = async (retryCount = 3) => {
  for (let i = 0; i < retryCount; i++) {
    try {
      console.log(`Попытка ${i + 1} получения API ключа OpenAI из Supabase...`);
      
      const { data, error } = await supabase
        .from('secrets')
        .select('value')
        .eq('name', 'OPENAI_API_KEY')
        .single();

      if (error) {
        console.error(`Попытка ${i + 1}: Ошибка при получении API ключа:`, error);
        if (i === retryCount - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        continue;
      }
      
      if (!data?.value) {
        throw new Error('API ключ OpenAI не найден в базе данных');
      }

      console.log('API ключ OpenAI успешно получен');
      return data.value;
    } catch (error) {
      console.error(`Попытка ${i + 1}: Ошибка при получении API ключа:`, error);
      if (i === retryCount - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
};

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
        timeout: 60000, // Увеличиваем таймаут до 60 секунд
        maxRetries: 3,  // Увеличиваем количество повторных попыток
        defaultHeaders: {
          'Content-Type': 'application/json',
        },
        defaultQuery: {
          'api-version': '2023-05-15',
        },
      });
      
      console.log('Клиент OpenAI успешно инициализирован');
    }
    return openai;
  } catch (error) {
    console.error('Ошибка при инициализации клиента OpenAI:', error);
    throw error;
  }
};

export const processPrompt = async (prompt, maxRetries = 3) => {
  let lastError = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const client = await initOpenAI();
      
      console.log(`Попытка ${i + 1} отправки запроса к OpenAI...`);
      const completion = await client.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "gpt-3.5-turbo",
        temperature: 0.7,
        max_tokens: 2000,
        timeout: 60000,
      });

      console.log('Ответ успешно получен от OpenAI');
      return completion.choices[0].message.content;
    } catch (error) {
      console.error(`Попытка ${i + 1} завершилась ошибкой:`, {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      lastError = error;
      
      // Если это не последняя попытка, ждем перед следующей
      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // Экспоненциальная задержка
        console.log(`Ожидание ${delay}мс перед следующей попыткой...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Не удалось получить ответ от OpenAI после ${maxRetries} попыток: ${lastError?.message}`);
};
