import { supabase } from '../config/supabase.js';

export const saveToStorage = async (userId, file) => {
  console.log('Начало сохранения файла в Storage:', {
    userId,
    filePath: file.path,
    contentLength: file.content?.length,
    contentType: typeof file.content
  });

  if (!file.content) {
    console.error('Ошибка: содержимое файла отсутствует');
    throw new Error('File content is required');
  }

  // Формируем путь в формате users/{userId}/files/{filename}
  const filePath = `users/${userId}/files/${file.path}`;
  
  try {
    console.log('Подготовка к загрузке файла:', { 
      filePath,
      contentType: typeof file.content 
    });
    
    // Конвертируем содержимое в Uint8Array для загрузки
    const contentBuffer = new TextEncoder().encode(file.content);

    console.log('Контент подготовлен для загрузки:', {
      bufferLength: contentBuffer.length,
      firstBytes: contentBuffer.slice(0, 10)
    });

    // Загружаем файл в Storage с метаданными
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('project_files')
      .upload(filePath, contentBuffer, {
        contentType: 'text/plain',
        upsert: true,
        metadata: {
          userId,
          fileName: file.path,
          createdAt: new Date().toISOString()
        }
      });

    if (uploadError) {
      console.error('Ошибка загрузки в Storage:', uploadError);
      throw uploadError;
    }

    console.log('Файл успешно загружен:', uploadData);

    // Получаем публичную ссылку на файл
    const { data: { publicUrl }, error: urlError } = await supabase.storage
      .from('project_files')
      .getPublicUrl(filePath);

    if (urlError) {
      console.error('Ошибка получения публичной ссылки:', urlError);
      throw urlError;
    }

    console.log('Получена публичная ссылка:', publicUrl);

    return {
      ...uploadData,
      publicUrl
    };
  } catch (error) {
    console.error('Критическая ошибка при сохранении файла:', error);
    throw error;
  }
};
