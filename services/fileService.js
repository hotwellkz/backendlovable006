import { supabase } from '../config/supabase.js';
import path from 'path';

export const saveFileToStorage = async (userId, file) => {
  console.log('Начало сохранения файла в Storage:', {
    userId,
    filePath: file.path,
    contentLength: file.content?.length
  });

  if (!file.content) {
    console.error('Ошибка: содержимое файла отсутствует');
    throw new Error('File content is required');
  }

  const filePath = `${userId}/${file.path}`;
  
  try {
    // Конвертируем содержимое в Uint8Array для загрузки
    const contentBuffer = new TextEncoder().encode(file.content);
    
    console.log('Подготовка к загрузке файла:', { 
      filePath,
      contentType: typeof file.content,
      bufferLength: contentBuffer.length
    });

    // Загружаем файл в storage
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

    // Получаем публичную ссылку
    const { data: urlData } = await supabase.storage
      .from('project_files')
      .getPublicUrl(filePath);

    return {
      ...uploadData,
      publicUrl: urlData.publicUrl
    };
  } catch (error) {
    console.error('Ошибка при сохранении файла:', error);
    throw error;
  }
};

export const saveFileMetadata = async (userId, file, uploadData) => {
  console.log('Сохранение метаданных файла:', {
    userId,
    filePath: file.path
  });

  try {
    const { data: existingFile } = await supabase
      .from('files')
      .select('*')
      .eq('file_path', `${userId}/${file.path}`)
      .maybeSingle();

    const version = existingFile ? (existingFile.version || 1) + 1 : 1;
    const previousVersions = existingFile?.previous_versions || [];

    if (existingFile) {
      previousVersions.push({
        version: existingFile.version || 1,
        content: existingFile.content || '',
        modified_at: existingFile.last_modified || new Date().toISOString(),
        modified_by: existingFile.modified_by || userId
      });
    }

    const { data: fileData, error: dbError } = await supabase
      .from('files')
      .upsert({
        user_id: userId,
        filename: path.basename(file.path),
        file_path: `${userId}/${file.path}`,
        content_type: 'text/plain',
        size: Buffer.byteLength(file.content, 'utf8'),
        content: file.content,
        version: version,
        previous_versions: previousVersions,
        last_modified: new Date().toISOString(),
        modified_by: userId,
        public_url: uploadData.publicUrl
      })
      .select()
      .single();

    if (dbError) {
      console.error('Ошибка сохранения метаданных:', dbError);
      throw dbError;
    }

    console.log('Метаданные файла сохранены:', {
      id: fileData.id,
      path: fileData.file_path,
      version: fileData.version
    });

    return fileData;
  } catch (error) {
    console.error('Ошибка при сохранении метаданных:', error);
    throw error;
  }
};
