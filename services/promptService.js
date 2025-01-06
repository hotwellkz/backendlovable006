import { supabase } from '../config/supabase.js';
import { generateResponse } from '../utils/openai/client.js';

export const validateRequest = (prompt, framework, userId) => {
  if (!prompt || !framework || !userId) {
    const missingParams = {
      prompt: !prompt,
      framework: !framework,
      userId: !userId
    };
    console.error('Отсутствуют обязательные параметры:', missingParams);
    throw new Error('Отсутствуют обязательные параметры');
  }
};

export const saveChatHistory = async (userId, prompt, isAi = false) => {
  try {
    const { data, error } = await supabase
      .from('chat_history')
      .insert({
        user_id: userId,
        prompt,
        is_ai: isAi,
        timestamp: new Date().toISOString(),
        status: isAi ? 'completed' : 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Ошибка сохранения в chat_history:', error);
      throw error;
    }

    return { data };
  } catch (error) {
    console.error('Ошибка при сохранении в историю чата:', error);
    throw error;
  }
};

export const updateChatStatus = async (userId, messageId, status) => {
  try {
    const { error } = await supabase
      .from('chat_history')
      .update({ status })
      .match({ id: messageId, user_id: userId });

    if (error) {
      console.error('Ошибка обновления статуса чата:', error);
      throw error;
    }
  } catch (error) {
    console.error('Ошибка при обновлении статуса чата:', error);
    throw error;
  }
};

export const handlePromptProcessing = async (prompt, framework, userId) => {
  console.log('Начало обработки промпта:', { framework, userId });
  let chatEntry = null;
  
  try {
    validateRequest(prompt, framework, userId);
    
    // Сохраняем промпт пользователя
    const { data: savedChat } = await saveChatHistory(userId, prompt);
    chatEntry = savedChat;
    
    // Обновляем статус на processing
    await updateChatStatus(userId, chatEntry.id, 'processing');

    // Генерируем ответ через OpenAI с повторными попытками
    const response = await generateResponse(prompt, framework);
    
    if (!response) {
      throw new Error('Получен пустой ответ от OpenAI');
    }
    
    console.log('Успешно получен ответ от OpenAI:', {
      filesCount: response.files?.length,
      description: response.description?.substring(0, 100) + '...'
    });

    // Сохраняем ответ ИИ
    await saveChatHistory(userId, response.description, true);
    await updateChatStatus(userId, chatEntry.id, 'completed');

    return response;
  } catch (error) {
    console.error('Ошибка при обработке промпта:', {
      error: error.message,
      stack: error.stack,
      userId,
      framework,
      timestamp: new Date().toISOString()
    });

    if (chatEntry?.id) {
      await updateChatStatus(userId, chatEntry.id, 'error');
    }

    throw error;
  }
};
