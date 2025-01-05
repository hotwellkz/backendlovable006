import { openaiQueue, fileQueue, dockerQueue } from '../queues/index.js';
import { supabase } from '../config/supabase.js';

export const handleFiles = async (req, res) => {
  try {
    const { files, userId } = req.body;
    console.log('Получен запрос на сохранение файлов:', { 
      filesCount: files?.length,
      userId 
    });

    if (!files || !Array.isArray(files)) {
      console.error('Ошибка: files не является массивом');
      return res.status(400).json({ error: 'Invalid files data' });
    }

    // Добавляем задачу в очередь обработки файлов
    const fileJob = await fileQueue.add({
      files,
      userId
    });

    console.log('Задача обработки файлов добавлена в очередь:', {
      jobId: fileJob.id
    });

    // Ожидаем завершения обработки
    const results = await fileJob.finished();

    res.json({ files: results });
  } catch (error) {
    console.error('Критическая ошибка при обработке файлов:', error);
    res.status(500).json({ 
      error: 'Failed to save files',
      details: error.message 
    });
  }
};

export const handleUpdateFiles = async (req, res) => {
  try {
    const { prompt, userId } = req.body;
    console.log('Получен запрос на обновление файлов:', { userId });

    // Добавляем задачу в очередь OpenAI
    const openaiJob = await openaiQueue.add({
      prompt,
      userId
    });

    console.log('Задача OpenAI добавлена в очередь:', {
      jobId: openaiJob.id
    });

    // Ожидаем ответ от OpenAI
    const response = JSON.parse(await openaiJob.finished());

    // Добавляем задачу в очередь обработки файлов
    const fileJob = await fileQueue.add({
      files: response.files,
      userId
    });

    console.log('Задача обработки файлов добавлена в очередь:', {
      jobId: fileJob.id
    });

    // Ожидаем завершения обработки файлов
    await fileJob.finished();

    res.json({
      success: true,
      message: 'Files updated successfully',
      description: response.description
    });
  } catch (error) {
    console.error('Критическая ошибка при обновлении файлов:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update files',
      details: error.message 
    });
  }
};
