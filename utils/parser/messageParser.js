import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export class MessageParser {
  constructor() {
    this.buffer = '';
    this.artifacts = [];
  }

  async parseOpenAIResponse(response) {
    try {
      console.log('Начало парсинга ответа OpenAI:', response);
      
      // Проверяем наличие content в ответе
      if (!response?.choices?.[0]?.message?.content) {
        throw new Error('Некорректный формат ответа от OpenAI');
      }

      const content = response.choices[0].message.content;
      
      // Пытаемся распарсить JSON
      try {
        const parsedContent = JSON.parse(content);
        console.log('Успешно распарсен JSON:', parsedContent);
        return parsedContent;
      } catch (jsonError) {
        console.error('Ошибка парсинга JSON:', jsonError);
        
        // Если не удалось распарсить JSON, пробуем извлечь структурированные данные
        const files = this.extractFiles(content);
        const description = this.extractDescription(content);
        
        return {
          files,
          description: description || 'Не удалось извлечь описание',
          dependencies: []
        };
      }
    } catch (error) {
      console.error('Ошибка при парсинге ответа:', error);
      throw new Error(`Ошибка при парсинге ответа: ${error.message}`);
    }
  }

  extractFiles(content) {
    const files = [];
    const fileRegex = /```(?:.*?)\n([\s\S]*?)```/g;
    let match;

    while ((match = fileRegex.exec(content)) !== null) {
      const fileContent = match[1];
      const pathMatch = content.slice(match.index - 100, match.index).match(/(?:file|path):\s*([^\n]+)/i);
      
      if (pathMatch) {
        files.push({
          path: pathMatch[1].trim(),
          content: fileContent.trim(),
          type: 'create'
        });
      }
    }

    return files;
  }

  extractDescription(content) {
    const descriptionMatch = content.match(/(?:описание|description):\s*([^\n]+)/i);
    return descriptionMatch ? descriptionMatch[1].trim() : null;
  }

  async saveToSupabase(userId, parsedResponse) {
    try {
      // Сохраняем описание в историю чата
      const { error: chatError } = await supabase
        .from('chat_history')
        .insert({
          user_id: userId,
          prompt: parsedResponse.description,
          is_ai: true
        });

      if (chatError) throw chatError;

      // Сохраняем файлы
      for (const file of parsedResponse.files) {
        const { error: fileError } = await supabase
          .from('files')
          .insert({
            user_id: userId,
            filename: file.path.split('/').pop(),
            file_path: `${userId}/${file.path}`,
            content: file.content,
            content_type: 'text/plain'
          });

        if (fileError) throw fileError;
      }

      return true;
    } catch (error) {
      console.error('Ошибка сохранения в Supabase:', error);
      throw error;
    }
  }
}
