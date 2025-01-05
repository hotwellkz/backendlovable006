import Queue from 'bull';
import { processOpenAIRequest } from './processors/openaiProcessor.js';
import { processFileGeneration } from './processors/fileProcessor.js';
import { processDockerOperations } from './processors/dockerProcessor.js';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
};

// Создаем очереди для разных операций
export const openaiQueue = new Queue('openai-processing', { redis: redisConfig });
export const fileQueue = new Queue('file-processing', { redis: redisConfig });
export const dockerQueue = new Queue('docker-operations', { redis: redisConfig });

// Настраиваем обработчики для каждой очереди
openaiQueue.process(processOpenAIRequest);
fileQueue.process(processFileGeneration);
dockerQueue.process(processDockerOperations);

// Обработка ошибок и мониторинг
const queues = [openaiQueue, fileQueue, dockerQueue];

queues.forEach(queue => {
  queue.on('error', (error) => {
    console.error(`Queue ${queue.name} error:`, error);
  });

  queue.on('failed', (job, error) => {
    console.error(`Job ${job.id} in ${queue.name} failed:`, error);
  });

  queue.on('completed', (job) => {
    console.log(`Job ${job.id} in ${queue.name} completed successfully`);
  });

  // Настройка повторных попыток
  queue.on('failed', async (job, err) => {
    if (job.attemptsMade < job.opts.attempts) {
      console.log(`Retrying job ${job.id} in ${queue.name}. Attempt ${job.attemptsMade + 1}`);
    }
  });
});
