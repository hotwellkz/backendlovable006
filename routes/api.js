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

// Логирование запросов
router.use((req, res, next) => {
  console.log(`API Request: ${req.method} ${req.originalUrl}`);
  next();
});

// Маршруты API
router.post('/prompt', async (req, res, next) => {
  try {
    await handlePrompt(req, res);
  } catch (error) {
    next(error);
  }
});

router.post('/files', async (req, res, next) => {
  try {
    await handleFiles(req, res);
  } catch (error) {
    next(error);
  }
});

router.post('/files/update', async (req, res, next) => {
  try {
    await handleUpdateFiles(req, res);
  } catch (error) {
    next(error);
  }
});

router.post('/deploy', async (req, res, next) => {
  try {
    await handleDeployment(req, res);
  } catch (error) {
    next(error);
  }
});

// Docker контейнеры
router.post('/containers', async (req, res, next) => {
  try {
    await createContainer(req, res);
  } catch (error) {
    next(error);
  }
});

router.get('/containers/:containerId/status', async (req, res, next) => {
  try {
    await getContainerStatus(req, res);
  } catch (error) {
    next(error);
  }
});

router.delete('/containers/:containerId', async (req, res, next) => {
  try {
    await deleteContainer(req, res);
  } catch (error) {
    next(error);
  }
});

export default router;
