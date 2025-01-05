import { supabase } from '../config/supabase.js';
import path from 'path';

export const saveFileMetadata = async (userId, file, uploadData) => {
  console.log('Сохранение метаданных файла:', {
    userId,
    filePath: file.path
  });

  const filePath = `${userId}/${file.path}`;

  try {
    // Получаем текущую версию файла, если она существует
    const { data: existingFile } = await supabase
      .from('files')
      .select('*')
      .eq('file_path', filePath)
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
        file_path: filePath,
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
      path: fileData.file_path,
      version
    });

    return fileData;
  } catch (error) {
    console.error('Ошибка при сохранении метаданных:', error);
    throw error;
  }
};
