import { initOpenAI } from '../openai.js';
import { getSystemPrompt } from './systemPrompts.js';

export const generateResponse = async (prompt, framework) => {
  console.time('openai_request');
  
  const openai = await initOpenAI();
  if (!openai) {
    throw new Error('Failed to initialize OpenAI client');
  }

  console.log('Отправка запроса к OpenAI с фреймворком:', framework);
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
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

  console.timeEnd('openai_request');

  if (!completion.choices?.[0]?.message?.content) {
    throw new Error('Invalid response from OpenAI API');
  }

  console.log('Получен ответ от OpenAI, парсинг JSON...');
  
  return completion.choices[0].message.content;
};
