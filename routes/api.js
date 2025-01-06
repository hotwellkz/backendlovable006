import express from 'express';
import { handlePrompt } from '../controllers/prompt.controller.js';
import { handleFiles, handleUpdateFiles } from '../controllers/files.controller.js';
import { handleDeployment } from '../controllers/deployment.controller.js';
import { 
  createContainer, 
  getContainerStatus, 
  deleteContainer 
} from '../controllers/docker/index.js';

const router = express.Router();

// Базовый маршрут для проверки API
router.get('/', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Docker API is running',
    version: 'v1.41',
    timestamp: new Date().toISOString()
  });
});

// Маршруты для работы с промптами и файлами
router.post('/prompt', handlePrompt);
router.post('/files', handleFiles);
router.post('/files/update', handleUpdateFiles);
router.post('/deploy', handleDeployment);

// Docker контейнеры
router.post('/containers', createContainer);
router.get('/containers/:containerId/status', getContainerStatus);
router.delete('/containers/:containerId', deleteContainer);

// Экспортируем роутер как default
export default router;
