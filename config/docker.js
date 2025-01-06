import Docker from 'dockerode';
import dotenv from 'dotenv';

dotenv.config();

const dockerConfig = {
  host: process.env.DOCKER_HOST || 'https://backendlovable006.onrender.com',
  port: process.env.DOCKER_PORT || 443,
  protocol: 'https',
  version: 'v1.41',
  timeout: 180000, // Увеличиваем таймаут до 3 минут
  headers: {
    'Content-Type': 'application/json',
  }
};

console.log('Initializing Docker client with config:', {
  host: dockerConfig.host,
  port: dockerConfig.port,
  protocol: dockerConfig.protocol,
  version: dockerConfig.version
});

const docker = new Docker(dockerConfig);

// Проверяем подключение с расширенным логированием
const initializeDocker = async () => {
  try {
    console.log('Attempting to connect to Docker daemon...');
    
    const info = await docker.info();
    console.log('Successfully connected to Docker daemon');
    console.log('Docker info:', {
      containers: info.Containers,
      images: info.Images,
      serverVersion: info.ServerVersion,
      operatingSystem: info.OperatingSystem
    });

    return true;
  } catch (error) {
    console.error('Failed to connect to Docker daemon:', error);
    console.error('Connection details:', {
      host: dockerConfig.host,
      port: dockerConfig.port,
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
