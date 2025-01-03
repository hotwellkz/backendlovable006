import OpenAI from 'openai';
import { supabase } from '../config/supabase.js';

// Функция для получения API ключа из Supabase
const getOpenAIKey = async () => {
  const { data, error } = await supabase
    .from('secrets')
    .select('value')
    .eq('name', 'OPENAI_API_KEY')
    .single();

  if (error) throw new Error('Не удалось получить API ключ OpenAI');
  return data.value;
};

// Инициализация OpenAI с ключом из Supabase
let openai = null;
export const initOpenAI = async () => {
  if (!openai) {
    const apiKey = await getOpenAIKey();
    openai = new OpenAI({ apiKey });
  }
  return openai;
};
