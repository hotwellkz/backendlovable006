import { initOpenAI } from '../openai.js';

export const generateResponse = async (prompt, framework) => {
  console.time('openai_request');
  
  const openai = await initOpenAI();
  if (!openai) {
    throw new Error('Failed to initialize OpenAI client');
  }

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

  return completion.choices[0].message.content;
};
