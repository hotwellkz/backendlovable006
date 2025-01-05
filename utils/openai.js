import OpenAI from 'openai';
import { supabase } from '../config/supabase.js';

// Переменная для кэширования API ключа
let cachedApiKey = null;

// Функция для получения API ключа из Supabase
const getOpenAIKey = async () => {
  if (cachedApiKey) return cachedApiKey;

  const { data, error } = await supabase
    .from('secrets')
    .select('value')
    .eq('name', 'OPENAI_API_KEY')
    .single();

  if (error) {
    console.error('Ошибка при получении ключа OpenAI из Supabase:', error.message);
    throw new Error('Не удалось получить API ключ OpenAI из таблицы secrets в Supabase.');
  }

  if (!data || !data.value) {
    throw new Error('API ключ OpenAI отсутствует в таблице secrets в Supabase.');
  }

  cachedApiKey = data.value; // Кэшируем ключ
  return cachedApiKey;
};

// Инициализация OpenAI с ключом из Supabase
let openai = null;

export const initOpenAI = async () => {
  try {
    if (!openai) {
      console.log('Инициализация OpenAI...');
      const apiKey = await getOpenAIKey();
      openai = new OpenAI({ apiKey });
      console.log('OpenAI успешно инициализирован');
    }
    return openai;
  } catch (error) {
    console.error('Ошибка инициализации OpenAI:', error.message);
    throw new Error('Не удалось инициализировать OpenAI.');
  }
};
