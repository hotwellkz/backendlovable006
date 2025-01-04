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

router.post('/prompt', handlePrompt);
router.post('/files', handleFiles);
router.post('/files/update', handleUpdateFiles);
router.post('/deploy', handleDeployment);

// Docker контейнеры
router.post('/containers', createContainer);
router.get('/containers/:containerId/status', getContainerStatus);
router.delete('/containers/:containerId', deleteContainer);

export default router;
