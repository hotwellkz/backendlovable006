import { supabase } from '../config/supabase.js';

export const saveToStorage = async (userId, file) => {
  console.log('Сохранение файла в Storage:', {
    userId,
    filePath: file.path,
    contentLength: file.content?.length
  });

  const filePath = `${userId}/${file.path}`;
  
  try {
    // Конвертируем содержимое в Uint8Array для загрузки
    const contentBuffer = new TextEncoder().encode(file.content);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('project_files')
      .upload(filePath, contentBuffer, {
        contentType: 'text/plain',
        upsert: true
      });

    if (uploadError) {
      console.error('Ошибка загрузки в Storage:', uploadError);
      throw uploadError;
    }

    console.log('Файл успешно загружен в Storage:', {
      path: filePath,
      uploadData
    });

    return uploadData;
  } catch (error) {
    console.error('Ошибка при сохранении файла:', error);
    throw error;
  }
};
