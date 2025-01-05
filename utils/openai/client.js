import { initOpenAI } from '../openai.js';
import { getSystemPrompt } from './systemPrompts.js';
import { MessageParser } from '../parser/messageParser.js';

export const generateResponse = async (prompt, framework) => {
  if (!prompt || !framework) {
    throw new Error('Отсутствуют необходимые параметры');
  }

  const openai = await initOpenAI();
  if (!openai) {
    throw new Error('Failed to initialize OpenAI client');
  }

  console.log('Отправка запроса к OpenAI с фреймворком:', framework);
  
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: getSystemPrompt(framework)
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });

    console.log('Получен ответ от OpenAI:', completion.choices[0].message);

    const messageParser = new MessageParser();
    const parsedResponse = await messageParser.parseOpenAIResponse(completion);
    
    return parsedResponse;
  } catch (error) {
    console.error('Ошибка при работе с OpenAI:', error);
    throw new Error(`Ошибка при обработке ответа от OpenAI: ${error.message}`);
  }
};
