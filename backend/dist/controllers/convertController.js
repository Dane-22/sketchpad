"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractPlanPreview = exports.uploadAndConvert = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const crypto_1 = __importDefault(require("crypto"));
const dxf_parser_1 = __importDefault(require("dxf-parser"));
const semaphore_1 = require("../utils/semaphore");
const redis_1 = require("../config/redis");
const CACHE_TTL = 86400; // 24 hours in seconds
const converterSemaphore = new semaphore_1.Semaphore(2); // Limit to 2 concurrent ODA conversions
const uploadAndConvert = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }
        const uploadedFilePath = req.file.path;
        const fileName = req.file.originalname;
        const ext = path_1.default.extname(fileName).toLowerCase();
        // 1. Generate SHA-256 hash of the uploaded file
        const fileBuffer = fs_1.default.readFileSync(uploadedFilePath);
        const hash = crypto_1.default.createHash('sha256').update(fileBuffer).digest('hex');
        const cacheKey = `dxf:hash:${hash}`;
        // 2. Check if we already have this file converted and cached
        if (redis_1.redisClient.isOpen) {
            try {
                const cachedStr = await redis_1.redisClient.get(cacheKey);
                if (cachedStr) {
                    // It's in cache! Clean up temp uploaded file and return instantly.
                    if (fs_1.default.existsSync(uploadedFilePath))
                        fs_1.default.unlinkSync(uploadedFilePath);
                    const parsedDxf = JSON.parse(cachedStr);
                    return res.json({ parsedDxf });
                }
            }
            catch (err) {
                console.warn(`Redis get error for key ${cacheKey}:`, err);
            }
        }
        if (ext === '.dxf') {
            // Direct DXF parsing
            const fileContent = fs_1.default.readFileSync(uploadedFilePath, 'utf-8');
            const parser = new dxf_parser_1.default();
            try {
                const parsedDxf = parser.parseSync(fileContent);
                if (fs_1.default.existsSync(uploadedFilePath))
                    fs_1.default.unlinkSync(uploadedFilePath); // cleanup
                // Save to cache
                if (redis_1.redisClient.isOpen) {
                    redis_1.redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(parsedDxf)).catch(err => console.error(err));
                }
                return res.json({ parsedDxf });
            }
            catch (err) {
                if (fs_1.default.existsSync(uploadedFilePath))
                    fs_1.default.unlinkSync(uploadedFilePath);
                return res.status(500).json({ error: 'Failed to parse DXF: ' + err.message });
            }
        }
        if (ext !== '.dwg' && ext !== '.skb' && ext !== '.skp') {
            if (fs_1.default.existsSync(uploadedFilePath))
                fs_1.default.unlinkSync(uploadedFilePath);
            return res.status(400).json({ error: 'Unsupported file format.' });
        }
        if (ext === '.skb' || ext === '.skp') {
            if (fs_1.default.existsSync(uploadedFilePath))
                fs_1.default.unlinkSync(uploadedFilePath);
            // NOTE: SketchUp files require the SketchUp C API. ODA doesn't support SKP/SKB natively without the BIM SDK.
            // We'll return an informative message directing user to upload via Canvas File Uploader for interactive 3D model blueprinting.
            return res.status(400).json({ error: '.skp/.skb conversion requires Autodesk Forge or SKP SDK. You can upload .skp files directly via "Upload File" to place an interactive 3D model blueprint card on your canvas.' });
        }
        // --- DWG Conversion using ODA File Converter ---
        // Create unique temp directories for this job
        const jobId = crypto_1.default.randomUUID();
        const inputDir = path_1.default.join(__dirname, '..', '..', 'tmp', `in_${jobId}`);
        const outputDir = path_1.default.join(__dirname, '..', '..', 'tmp', `out_${jobId}`);
        fs_1.default.mkdirSync(inputDir, { recursive: true });
        fs_1.default.mkdirSync(outputDir, { recursive: true });
        // Move the uploaded file into the input directory
        const newFilePath = path_1.default.join(inputDir, fileName);
        fs_1.default.renameSync(uploadedFilePath, newFilePath);
        // Allow user to set the path in .env, otherwise default to standard Windows path
        const odaPath = process.env.ODA_CONVERTER_PATH || "C:\\Program Files\\ODA\\ODAFileConverter 27.1.0\\ODAFileConverter.exe";
        const command = `"${odaPath}" "${inputDir}" "${outputDir}" "ACAD2018" "DXF" "0" "0"`;
        // Queue the conversion using our Semaphore
        await converterSemaphore.run(async () => {
            return new Promise((resolve, reject) => {
                (0, child_process_1.exec)(command, (error, stdout, stderr) => {
                    try {
                        if (error) {
                            console.error("ODA Converter Error:", error);
                            throw new Error('ODA File Converter failed. Is it installed at ' + odaPath + '?');
                        }
                        // Find the output .dxf file
                        const convertedFiles = fs_1.default.readdirSync(outputDir);
                        const dxfFile = convertedFiles.find(f => f.toLowerCase().endsWith('.dxf'));
                        if (!dxfFile) {
                            throw new Error('Conversion failed: No DXF file output found.');
                        }
                        const dxfPath = path_1.default.join(outputDir, dxfFile);
                        const fileContent = fs_1.default.readFileSync(dxfPath, 'utf-8');
                        const parser = new dxf_parser_1.default();
                        const parsedDxf = parser.parseSync(fileContent);
                        // Save to cache
                        if (redis_1.redisClient.isOpen) {
                            redis_1.redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(parsedDxf)).catch(err => console.error(err));
                        }
                        res.json({ parsedDxf });
                        resolve();
                    }
                    catch (err) {
                        reject(err);
                    }
                    finally {
                        // Cleanup temp directories
                        if (fs_1.default.existsSync(inputDir))
                            fs_1.default.rmSync(inputDir, { recursive: true, force: true });
                        if (fs_1.default.existsSync(outputDir))
                            fs_1.default.rmSync(outputDir, { recursive: true, force: true });
                    }
                });
            });
        });
    }
    catch (error) {
        console.error("Upload error:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message || 'Server error during upload.' });
        }
    }
};
exports.uploadAndConvert = uploadAndConvert;
/**
 * Extracts real embedded plan image from .dwg or .skp file.
 */
const extractPlanPreview = async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded.' });
            return;
        }
        const { extractPlanImageFromFile } = await Promise.resolve().then(() => __importStar(require('../utils/cadThumbnailExtractor')));
        const extracted = extractPlanImageFromFile(req.file.path);
        if (extracted && extracted.buffer) {
            const uniqueName = `extracted-${Date.now()}-${crypto_1.default.randomBytes(4).toString('hex')}.${extracted.mimeType === 'image/png' ? 'png' : extracted.mimeType === 'image/jpeg' ? 'jpg' : 'bmp'}`;
            const uploadsDir = path_1.default.join(__dirname, '..', '..', 'uploads', 'canvas');
            if (!fs_1.default.existsSync(uploadsDir))
                fs_1.default.mkdirSync(uploadsDir, { recursive: true });
            const savePath = path_1.default.join(uploadsDir, uniqueName);
            fs_1.default.writeFileSync(savePath, extracted.buffer);
            if (fs_1.default.existsSync(req.file.path))
                fs_1.default.unlinkSync(req.file.path);
            res.json({
                success: true,
                hasRealThumbnail: true,
                previewUrl: `/uploads/canvas/${uniqueName}`,
                mimeType: extracted.mimeType,
                size: extracted.buffer.length
            });
            return;
        }
        if (fs_1.default.existsSync(req.file.path))
            fs_1.default.unlinkSync(req.file.path);
        res.json({
            success: false,
            hasRealThumbnail: false,
            message: 'No embedded raster thumbnail found in file structure.'
        });
    }
    catch (err) {
        console.error('Error extracting plan preview:', err);
        if (req.file && fs_1.default.existsSync(req.file.path))
            fs_1.default.unlinkSync(req.file.path);
        res.status(500).json({ error: err.message || 'Failed to extract preview.' });
    }
};
exports.extractPlanPreview = extractPlanPreview;
