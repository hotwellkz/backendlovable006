import express from 'express';
import { handlePrompt } from '../controllers/prompt.controller.js';
import { handleFiles, handleUpdateFiles } from '../controllers/files.controller.js';
import { handleDeployment } from '../controllers/deployment.controller.js';

const router = express.Router();

router.post('/prompt', handlePrompt);
router.post('/files', handleFiles);
router.post('/update-files', handleUpdateFiles);
router.post('/deploy', handleDeployment);

export default router;
