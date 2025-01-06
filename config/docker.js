import Docker from 'dockerode';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Создаем директорию для сертификатов если её нет
const certsDir = path.join(process.cwd(), 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

// Записываем сертификаты из переменных окружения
const writeCertFile = (filename, content) => {
  const filepath = path.join(certsDir, filename);
  fs.writeFileSync(filepath, content, 'utf8');
  return filepath;
};

const caPath = writeCertFile('ca.pem', process.env.DOCKER_CA || '');
const certPath = writeCertFile('cert.pem', process.env.DOCKER_CERT || '');
const keyPath = writeCertFile('key.pem', process.env.DOCKER_KEY || '');

const dockerConfig = {
  host: 'docker-jy4o.onrender.com',
  port: 2376, // Стандартный порт Docker TLS
  protocol: 'https',
  version: 'v1.41',
  timeout: 120000,
  ca: fs.readFileSync(caPath),
  cert: fs.readFileSync(certPath),
  key: fs.readFileSync(keyPath),
  headers: {
    'Content-Type': 'application/json',
  },
  followAllRedirects: true
};

console.log('Initializing Docker client with config:', {
  host: dockerConfig.host,
  port: dockerConfig.port,
  protocol: dockerConfig.protocol,
  version: dockerConfig.version,
  certsConfigured: !!(dockerConfig.ca && dockerConfig.cert && dockerConfig.key)
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
