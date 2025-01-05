import { supabase } from '../config/supabase.js';
import path from 'path';

export const saveFileToStorage = async (userId, file) => {
  console.log('Сохранение файла в Storage:', {
    userId,
    filePath: file.path,
    contentLength: file.content?.length
  });

  const filePath = `${userId}/${file.path}`;
  
  try {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('project_files')
      .upload(filePath, file.content, {
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
        modified_by: userId
      })
      .select()
      .single();

    if (dbError) {
      console.error('Ошибка сохранения метаданных:', dbError);
      throw dbError;
    }

    console.log('Метаданные файла сохранены:', {
      id: fileData.id,
      path: fileData.file_path
    });

    return fileData;
  } catch (error) {
    console.error('Ошибка при сохранении метаданных:', error);
    throw error;
  }
};
