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
  }
};

console.log('Initializing Docker client with config:', {
  host: dockerConfig.host,
  port: dockerConfig.port,
  protocol: dockerConfig.protocol
});

const docker = new Docker(dockerConfig);

// Проверяем подключение с расширенным логированием и обработкой ошибок
const initializeDocker = async () => {
  try {
    console.log('Attempting to connect to Docker daemon...');
    
    // Проверяем базовое соединение через info вместо version
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
      error: error.message
    });
    
    // Не прерываем работу приложения, просто логируем ошибку
    return false;
  }
};

// Инициализируем подключение
initializeDocker();

export { docker };
