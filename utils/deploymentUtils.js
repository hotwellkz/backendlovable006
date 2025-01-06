/**
 * Рассчитывает таймаут сборки на основе размера и сложности проекта
 */
export const calculateBuildTimeout = (files, framework) => {
  // Базовый таймаут 5 минут
  const BASE_TIMEOUT = 300000;
  
  // Увеличиваем таймаут в зависимости от количества файлов
  const fileCount = files.length;
  const fileCountMultiplier = Math.ceil(fileCount / 10); // +1 минута на каждые 10 файлов
  
  // Фреймворк-специфичные модификаторы
  const frameworkMultipliers = {
    'react': 1.2,    // React проекты могут требовать больше времени
    'vue': 1.1,      // Vue проекты обычно собираются быстрее
    'node': 1.0      // Node.js без фронтенда - базовый множитель
  };
  
  const frameworkMultiplier = frameworkMultipliers[framework] || 1.0;
  
  // Рассчитываем итоговый таймаут
  const timeout = BASE_TIMEOUT * frameworkMultiplier + (fileCountMultiplier * 60000);
  
  // Максимальный таймаут 15 минут
  const MAX_TIMEOUT = 900000;
  
  return Math.min(timeout, MAX_TIMEOUT);
};

/**
 * Определяет, нужно ли повторить попытку сборки
 */
export const shouldRetryBuild = (currentRetry, maxRetries) => {
  return currentRetry < maxRetries - 1;
};
