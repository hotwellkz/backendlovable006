import Docker from 'dockerode';
import dotenv from 'dotenv';

dotenv.config();

const dockerConfig = {
  host: 'http://146.190.214.152',  // Используем ваш Docker сервер
  port: 2375,
  timeout: 60000, // 60 секунд таймаут
  protocol: 'http'  // Явно указываем протокол
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
