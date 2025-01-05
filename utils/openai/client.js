import { initOpenAI } from '../openai.js';
import { getSystemPrompt } from './systemPrompts.js';

export const generateResponse = async (prompt, framework) => {
  console.time('openai_request');
  
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
      max_tokens: 4000,
      response_format: { type: "json_object" }
    });

    console.log('Получен ответ от OpenAI:', completion.choices[0].message);

    if (!completion.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI API');
    }

    console.log('Парсинг JSON ответа...');
    const parsedResponse = JSON.parse(completion.choices[0].message.content);
    console.log('JSON успешно распарсен');
    
    return parsedResponse;
  } catch (error) {
    console.error('Ошибка при работе с OpenAI:', error);
    throw new Error(`Ошибка при обработке ответа от OpenAI: ${error.message}`);
  }
};
