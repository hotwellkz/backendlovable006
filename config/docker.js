import Docker from 'dockerode';
import dotenv from 'dotenv';

dotenv.config();

const dockerConfig = {
  host: 'docker-jy4o.onrender.com',
  port: 80,
  protocol: 'http',
  version: 'v1.41',
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
  followAllRedirects: true // Добавляем поддержку редиректов
};

console.log('Initializing Docker client with config:', {
  host: dockerConfig.host,
  port: dockerConfig.port,
  protocol: dockerConfig.protocol,
  version: dockerConfig.version
});

const docker = new Docker(dockerConfig);

// Проверяем подключение с расширенным логированием и обработкой ошибок
const initializeDocker = async () => {
  try {
    console.log('Attempting to connect to Docker daemon...');
    
    // Проверяем базовое соединение через ping вместо info
    const ping = await docker.ping();
    console.log('Docker ping response:', ping);
    
    if (ping._status === 'OK') {
      console.log('Successfully connected to Docker daemon');
      
      // Теперь пробуем получить информацию
      const info = await docker.info();
      console.log('Docker info:', {
        containers: info.Containers,
        images: info.Images,
        serverVersion: info.ServerVersion,
        operatingSystem: info.OperatingSystem
      });
    } else {
      throw new Error('Docker ping failed');
    }

    return true;
  } catch (error) {
    console.error('Failed to connect to Docker daemon:', error);
    console.error('Connection details:', {
      host: dockerConfig.host,
      port: dockerConfig.port,
      protocol: dockerConfig.protocol,
      version: dockerConfig.version,
      error: error.message,
      stack: error.stack
    });
    
    // Не прерываем работу приложения, просто логируем ошибку
    return false;
  }
};

// Инициализируем подключение
initializeDocker();

export { docker };
