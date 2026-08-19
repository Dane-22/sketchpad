import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const router = Router();

// Ensure the canvas uploads directory exists
const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'canvas');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage with persistent filename and extension
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const uniqueId = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    cb(null, `${uniqueId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max file size for CAD/BIM assets
  fileFilter: (_req, file, cb) => {
    // Allow all engineering CAD, 3D, document and image file types
    cb(null, true);
  }
});

/**
 * POST /api/v1/uploads/canvas-asset
 * Upload an image or rendered PDF blueprint asset for lightweight canvas referencing.
 */
router.post('/canvas-asset', upload.single('file'), (req: Request, res: Response): void => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const publicUrl = `/uploads/canvas/${req.file.filename}`;

    res.status(201).json({
      success: true,
      url: publicUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype
    });
  } catch (error: any) {
    console.error('Error handling canvas asset upload:', error);
    res.status(500).json({ error: error.message || 'Failed to upload canvas asset' });
  }
});

export default router;
