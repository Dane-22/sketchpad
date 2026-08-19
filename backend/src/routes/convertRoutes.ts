import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { uploadAndConvert, extractPlanPreview } from '../controllers/convertController';

const router = Router();

// Setup multer to store uploaded files in the local tmp directory
const tmpDir = path.join(__dirname, '..', '..', 'tmp');
const upload = multer({ 
  dest: tmpDir,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit for CAD/SKP
});

router.post('/convert', upload.single('file'), uploadAndConvert);
router.post('/convert/extract-preview', upload.single('file'), extractPlanPreview);

export default router;
