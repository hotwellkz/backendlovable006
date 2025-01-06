import Docker from 'dockerode';
import dotenv from 'dotenv';

dotenv.config();

const dockerConfig = {
  host: 'docker-jy4o.onrender.com',  // Убираем https:// из host
  port: 443,
  protocol: 'https',
  version: 'v1.41',
  timeout: 180000,
  ca: process.env.DOCKER_CA,
  cert: process.env.DOCKER_CERT,
  key: process.env.DOCKER_KEY,
  headers: {
    'Content-Type': 'application/json',
  }
};

console.log('Инициализация Docker клиента с конфигурацией:', {
  host: dockerConfig.host,
  port: dockerConfig.port,
  protocol: dockerConfig.protocol,
  version: dockerConfig.version
});

const docker = new Docker(dockerConfig);

const initializeDocker = async () => {
  try {
    console.log('Попытка подключения к Docker демону...');
    
    const containers = await docker.listContainers();
    console.log('Успешное подключение к Docker демону');
    console.log('Активные контейнеры:', containers.length);

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
      reason: error.reason || 'Неизвестная причина'
    });
    
    return false;
  }
};

initializeDocker();

export { docker };
