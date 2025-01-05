import { supabase } from '../config/supabase.js';
import path from 'path';

export const saveFileMetadata = async (userId, file, uploadData) => {
  console.log('Начало сохранения метаданных файла:', {
    userId,
    filePath: file.path,
    uploadData
  });

  const filePath = `users/${userId}/files/${file.path}`;

  try {
    // Получаем текущую версию файла, если она существует
    const { data: existingFile, error: fetchError } = await supabase
      .from('files')
      .select('*')
      .eq('file_path', filePath)
      .maybeSingle();

    if (fetchError) {
      console.error('Ошибка при получении существующего файла:', fetchError);
      throw fetchError;
    }

    console.log('Существующий файл:', existingFile);

    const version = existingFile ? (existingFile.version || 1) + 1 : 1;
    const previousVersions = existingFile?.previous_versions || [];

    // Если файл существует, сохраняем его текущую версию в историю
    if (existingFile) {
      previousVersions.push({
        version: existingFile.version || 1,
        content: existingFile.content || '',
        modified_at: existingFile.last_modified || new Date().toISOString(),
        modified_by: existingFile.modified_by || userId
      });
    }

    console.log('Подготовка к сохранению метаданных:', {
      version,
      previousVersionsCount: previousVersions.length
    });

    // Сохраняем или обновляем метаданные файла
    const { data: fileData, error: dbError } = await supabase
      .from('files')
      .upsert({
        user_id: userId,
        filename: path.basename(file.path),
        file_path: filePath,
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

    console.log('Метаданные успешно сохранены:', {
      id: fileData.id,
      path: fileData.file_path,
      version: fileData.version
    });

    return fileData;
  } catch (error) {
    console.error('Критическая ошибка при сохранении метаданных:', error);
    throw error;
  }
};
