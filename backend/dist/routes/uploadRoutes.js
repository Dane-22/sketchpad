"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
// Ensure the canvas uploads directory exists
const uploadsDir = path_1.default.join(__dirname, '..', '..', 'uploads', 'canvas');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Configure multer storage with persistent filename and extension
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase() || '.png';
        const uniqueId = `${Date.now()}-${crypto_1.default.randomBytes(8).toString('hex')}`;
        cb(null, `${uniqueId}${ext}`);
    }
});
const upload = (0, multer_1.default)({
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
router.post('/canvas-asset', upload.single('file'), (req, res) => {
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
    }
    catch (error) {
        console.error('Error handling canvas asset upload:', error);
        res.status(500).json({ error: error.message || 'Failed to upload canvas asset' });
    }
});
exports.default = router;
