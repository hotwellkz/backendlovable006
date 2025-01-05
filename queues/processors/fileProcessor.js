import { saveToStorage } from '../../services/storageService.js';
import { saveFileMetadata } from '../../services/fileMetadataService.js';

export const processFileGeneration = async (job) => {
  const { files, userId } = job.data;
  console.log('Processing files:', { filesCount: files.length, userId });

  const results = [];
  
  for (const file of files) {
    try {
      console.log(`Processing file: ${file.path}`);
      
      // Сохраняем файл в Storage
      const uploadData = await saveToStorage(userId, file);
      console.log('File saved to storage:', uploadData);

      // Сохраняем метаданные
      const fileData = await saveFileMetadata(userId, file, uploadData);
      console.log('File metadata saved:', fileData);
      
      results.push({
        path: file.path,
        url: `/uploads/${file.path}`,
        version: fileData.version
      });
    } catch (error) {
      console.error(`Error processing file ${file.path}:`, error);
      throw error;
    }
  }

  return results;
};
