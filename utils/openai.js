import OpenAI from 'openai';
import { supabase } from '../config/supabase.js';

// Функция для получения API ключа из Supabase
const getOpenAIKey = async () => {
  try {
    console.log('Получаем API ключ OpenAI из Supabase...');
    const { data, error } = await supabase
      .from('secrets')
      .select('value')
      .eq('name', 'OPENAI_API_KEY')
      .single();

    if (error) {
      console.error('Ошибка при получении API ключа:', error);
      throw new Error('Не удалось получить API ключ OpenAI');
    }
    
    if (!data || !data.value) {
      console.error('API ключ не найден в базе данных');
      throw new Error('API ключ OpenAI не найден');
    }

    return data.value;
  } catch (error) {
    console.error('Критическая ошибка при получении API ключа:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

// Инициализация OpenAI с ключом из Supabase
let openai = null;
export const initOpenAI = async () => {
  try {
    if (!openai) {
      console.log('Инициализация клиента OpenAI...');
      const apiKey = await getOpenAIKey();
      openai = new OpenAI({ 
        apiKey,
        timeout: 30000, // 30 секунд таймаут для всех запросов
        maxRetries: 2 // Максимальное количество повторных попыток
      });
      console.log('Клиент OpenAI успешно инициализирован');
    }
    return openai;
  } catch (error) {
    console.error('Критическая ошибка при инициализации OpenAI:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};
