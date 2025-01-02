import express from 'express';
import { handlePrompt, handleUpdateFiles, handleFiles } from '../controllers/api.controller.js';

const router = express.Router();

router.post('/prompt', handlePrompt);
router.post('/update-files', handleUpdateFiles);
router.post('/files', handleFiles);

export default router;
