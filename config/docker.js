import Docker from 'dockerode';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Функция для проверки и форматирования PEM-данных
const formatPEMData = (data, type) => {
  const beginMarker = `-----BEGIN ${type}-----\n`;
  const endMarker = `\n-----END ${type}-----`;
  
  // Удаляем существующие маркеры и лишние пробелы
  let content = data.replace(/-----BEGIN [^-]+-----/, '')
                   .replace(/-----END [^-]+-----/, '')
                   .trim();
                   
  // Добавляем переносы строк каждые 64 символа
  content = content.replace(/(.{64})/g, '$1\n');
  
  return `${beginMarker}${content}${endMarker}`;
};

// Создаем директорию для сертификатов если её нет
const certsDir = path.join(process.cwd(), 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

// Записываем сертификаты из переменных окружения с правильным форматированием
const writeCertFile = (filename, content, type) => {
  const filepath = path.join(certsDir, filename);
  const formattedContent = formatPEMData(content, type);
  fs.writeFileSync(filepath, formattedContent, 'utf8');
  return filepath;
};

// Проверяем наличие всех необходимых переменных окружения
const requiredEnvVars = ['DOCKER_CA', 'DOCKER_CERT', 'DOCKER_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars);
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

const caPath = writeCertFile('ca.pem', process.env.DOCKER_CA || '', 'CERTIFICATE');
const certPath = writeCertFile('cert.pem', process.env.DOCKER_CERT || '', 'CERTIFICATE');
const keyPath = writeCertFile('key.pem', process.env.DOCKER_KEY || '', 'PRIVATE KEY');

// Проверяем содержимое файлов перед использованием
const validatePEMFile = (filepath, type) => {
  const content = fs.readFileSync(filepath, 'utf8');
  if (!content.includes(`BEGIN ${type}`) || !content.includes(`END ${type}`)) {
    throw new Error(`Invalid ${type} format in ${filepath}`);
  }
  return content;
};

const dockerConfig = {
  host: 'docker-jy4o.onrender.com',
  port: 2376,
  protocol: 'https',
  version: 'v1.41',
  timeout: 120000,
  ca: validatePEMFile(caPath, 'CERTIFICATE'),
  cert: validatePEMFile(certPath, 'CERTIFICATE'),
  key: validatePEMFile(keyPath, 'PRIVATE KEY'),
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
    
    // Проверяем базовое соединение через ping
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
