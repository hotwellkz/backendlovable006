import { supabase } from '../config/supabase.js';
import { generateResponse } from '../utils/openai/client.js';

export const validateRequest = (prompt, framework, userId) => {
  const missingParams = {
    prompt: !prompt,
    framework: !framework,
    userId: !userId
  };

  if (!prompt || !framework || !userId) {
    console.error('Missing parameters:', missingParams);
    throw new Error('Missing required parameters');
  }
};

export const saveChatHistory = async (userId, prompt, isAi = false) => {
  const { error } = await supabase
    .from('chat_history')
    .insert({
      user_id: userId,
      prompt,
      is_ai: isAi,
      timestamp: new Date().toISOString(),
      status: isAi ? 'completed' : 'pending'
    });

  if (error) {
    console.error('Error saving to chat_history:', error);
    throw error;
  }
};

export const updateChatStatus = async (userId, messageId, status) => {
  const { error } = await supabase
    .from('chat_history')
    .update({ status })
    .match({ id: messageId, user_id: userId });

  if (error) {
    console.error('Error updating chat status:', error);
    throw error;
  }
};

export const handlePromptProcessing = async (prompt, framework, userId) => {
  console.log('Начало обработки промпта:', { framework, userId });
  
  try {
    validateRequest(prompt, framework, userId);
    
    // Сохраняем промпт пользователя
    const { data: chatEntry } = await saveChatHistory(userId, prompt);
    
    // Обновляем статус на processing
    await updateChatStatus(userId, chatEntry.id, 'processing');

    // Генерируем ответ через OpenAI
    const response = await generateResponse(prompt, framework);
    
    console.log('Успешно получен ответ от OpenAI:', {
      filesCount: response.files?.length,
      description: response.description?.substring(0, 100) + '...'
    });

    // Сохраняем ответ ИИ и обновляем статус на completed
    await saveChatHistory(userId, response.description, true);
    await updateChatStatus(userId, chatEntry.id, 'completed');

    return response;
  } catch (error) {
    console.error('Ошибка при обработке промпта:', error);
    if (chatEntry?.id) {
      await updateChatStatus(userId, chatEntry.id, 'error');
    }
    throw error;
  }
};
