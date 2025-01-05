import { saveToStorage } from '../../services/storageService.js';
import { saveFileMetadata } from '../../services/fileMetadataService.js';

export const processFileGeneration = async (job) => {
  const { files, userId } = job.data;
  console.log('Начало обработки файлов:', { 
    filesCount: files?.length,
    userId 
  });

  if (!files || !Array.isArray(files)) {
    console.error('Ошибка: files не является массивом');
    throw new Error('Invalid files data');
  }

  const results = [];
  
  for (const file of files) {
    try {
      console.log(`Обработка файла: ${file.path}`, {
        contentLength: file.content?.length,
        hasPath: Boolean(file.path)
      });
      
      // Валидация файла
      if (!file.path || !file.content) {
        console.error(`Ошибка: некорректные данные файла: ${file.path}`);
        throw new Error(`Invalid file data for file: ${file.path}`);
      }

      // Сохраняем файл в Storage
      const uploadData = await saveToStorage(userId, file);
      console.log('Файл сохранен в storage:', uploadData);

      // Сохраняем метаданные
      const fileData = await saveFileMetadata(userId, file, uploadData);
      console.log('Метаданные файла сохранены:', fileData);
      
      results.push({
        path: file.path,
        url: fileData.public_url,
        version: fileData.version
      });
    } catch (error) {
      console.error(`Ошибка обработки файла ${file.path}:`, error);
      throw error;
    }
  }

  console.log('Все файлы успешно обработаны:', {
    processedCount: results.length,
    results
  });

  return results;
};
