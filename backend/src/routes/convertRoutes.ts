import { Router } from 'express';
import multer from 'multer';
import os from 'os';
import { uploadAndConvert } from '../controllers/convertController';

const router = Router();

import path from 'path';

// Setup multer to store uploaded files in the local tmp directory
const tmpDir = path.join(__dirname, '..', '..', 'tmp');
const upload = multer({ 
  dest: tmpDir,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

router.post('/convert', upload.single('file'), uploadAndConvert);

export default router;
