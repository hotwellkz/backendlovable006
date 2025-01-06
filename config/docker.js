import Docker from 'dockerode';
import dotenv from 'dotenv';

dotenv.config();

const dockerConfig = {
  host: process.env.DOCKER_HOST || 'docker-jy4o.onrender.com',
  port: process.env.DOCKER_PORT || 443,
  protocol: 'https',
  version: 'v1.41',
  timeout: 180000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'Lovable-Docker-Client'
  }
};

console.log('Инициализация Docker клиента с конфигурацией:', {
  host: dockerConfig.host,
  port: dockerConfig.port,
  protocol: dockerConfig.protocol,
  version: dockerConfig.version
});

const docker = new Docker({
  ...dockerConfig,
  agent: false, // Отключаем http agent для тестирования без SSL
  Promise: Promise
});

const initializeDocker = async () => {
  try {
    console.log('Попытка подключения к Docker демону...');
    
    // Пробуем получить список контейнеров для проверки подключения
    const containers = await docker.listContainers({
      all: true,
      size: false,
      limit: 1
    });
    
    console.log('Успешное подключение к Docker демону');
    console.log('Активные контейнеры:', containers.length);

    // Получаем информацию о Docker демоне
    const info = await docker.info();
    console.log('Информация о Docker демоне:', {
      containers: info.Containers,
      images: info.Images,
      serverVersion: info.ServerVersion,
      operatingSystem: info.OperatingSystem
    });

    return true;
  } catch (error) {
    console.error('Ошибка подключения к Docker демону:', error);
    console.error('Детали подключения:', {
      host: dockerConfig.host,
      port: dockerConfig.port,
      error: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
      reason: error.reason || 'Неизвестная причина',
      response: error.response?.data
    });
    
    // Пробуем получить версию Docker для дополнительной диагностики
    try {
      const version = await docker.version();
      console.log('Версия Docker:', version);
    } catch (versionError) {
      console.error('Не удалось получить версию Docker:', versionError.message);
    }
    
    return false;
  }
};

initializeDocker();

export { docker };
