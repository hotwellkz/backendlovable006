import { supabase } from '../config/supabase.js';

export const saveToStorage = async (userId, file) => {
  console.log('Сохранение файла в Storage:', {
    userId,
    filePath: file.path,
    contentLength: file.content?.length
  });

  // Формируем путь в формате users/{userId}/files/{filename}
  const filePath = `users/${userId}/files/${file.path}`;
  
  try {
    // Конвертируем содержимое в Uint8Array для загрузки
    const contentBuffer = new TextEncoder().encode(file.content);

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

    // Получаем публичную ссылку на файл
    const { data: { publicUrl }, error: urlError } = await supabase.storage
      .from('project_files')
      .getPublicUrl(filePath);

    if (urlError) {
      console.error('Ошибка получения публичной ссылки:', urlError);
      throw urlError;
    }

    console.log('Файл успешно загружен в Storage:', {
      path: filePath,
      url: publicUrl,
      uploadData
    });

    return {
      ...uploadData,
      publicUrl
    };
  } catch (error) {
    console.error('Ошибка при сохранении файла:', error);
    throw error;
  }
};
