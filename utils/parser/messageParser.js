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
      
      if (!response?.choices?.[0]?.message?.content) {
        throw new Error('Некорректный формат ответа от OpenAI');
      }

      const content = response.choices[0].message.content;
      
      try {
        const parsedContent = JSON.parse(content);
        console.log('Успешно распарсен JSON:', parsedContent);
        return parsedContent;
      } catch (jsonError) {
        console.error('Ошибка парсинга JSON:', jsonError);
        
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
          action: 'create'
        });
      }
    }

    console.log('Извлеченные файлы:', files);
    return files;
  }

  extractDescription(content) {
    const descriptionMatch = content.match(/(?:описание|description):\s*([^\n]+)/i);
    return descriptionMatch ? descriptionMatch[1].trim() : null;
  }

  async saveToSupabase(userId, parsedResponse) {
    try {
      console.log('Сохранение в Supabase для пользователя:', userId);
      console.log('Данные для сохранения:', parsedResponse);

      // Сохраняем описание в историю чата
      const { error: chatError } = await supabase
        .from('chat_history')
        .insert({
          user_id: userId,
          prompt: parsedResponse.description,
          is_ai: true
        });

      if (chatError) {
        console.error('Ошибка сохранения в chat_history:', chatError);
        throw chatError;
      }

      // Сохраняем файлы
      for (const file of parsedResponse.files) {
        // Сначала загружаем файл в Storage
        const { error: uploadError } = await supabase.storage
          .from('project_files')
          .upload(`${userId}/${file.path}`, file.content, {
            contentType: 'text/plain',
            upsert: true
          });

        if (uploadError) {
          console.error('Ошибка загрузки в Storage:', uploadError);
          throw uploadError;
        }

        // Затем сохраняем метаданные в таблицу files
        const { error: fileError } = await supabase
          .from('files')
          .upsert({
            user_id: userId,
            filename: file.path.split('/').pop(),
            file_path: `${userId}/${file.path}`,
            content: file.content,
            content_type: 'text/plain',
            size: Buffer.byteLength(file.content, 'utf8'),
            version: 1,
            last_modified: new Date().toISOString(),
            modified_by: userId
          });

        if (fileError) {
          console.error('Ошибка сохранения в files:', fileError);
          throw fileError;
        }
      }

      console.log('Данные успешно сохранены в Supabase');
      return true;
    } catch (error) {
      console.error('Ошибка сохранения в Supabase:', error);
      throw error;
    }
  }
}
