import Docker from 'dockerode';
import dotenv from 'dotenv';

dotenv.config();

const dockerConfig = {
  host: 'https://docker-jy4o.onrender.com',  // Обновленный URL Docker сервера
  port: 443, // Используем HTTPS порт
  protocol: 'https',  // Используем HTTPS протокол
  timeout: 60000, // 60 секунд таймаут
};

console.log('Initializing Docker client with config:', {
  host: dockerConfig.host,
  port: dockerConfig.port,
  protocol: dockerConfig.protocol
});

const docker = new Docker(dockerConfig);

// Проверяем подключение с расширенным логированием
docker.ping().then(() => {
  console.log('Successfully connected to Docker daemon');
  
  // Дополнительная проверка информации о Docker
  return docker.info();
}).then((info) => {
  console.log('Docker info:', {
    containers: info.Containers,
    images: info.Images,
    serverVersion: info.ServerVersion,
    operatingSystem: info.OperatingSystem
  });
}).catch(error => {
  console.error('Failed to connect to Docker daemon:', error);
  console.error('Connection details:', {
    host: dockerConfig.host,
    port: dockerConfig.port,
    error: error.message
  });
});

export { docker };
