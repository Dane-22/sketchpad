"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAndConvert = void 0;
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
        if (ext !== '.dwg' && ext !== '.skb') {
            if (fs_1.default.existsSync(uploadedFilePath))
                fs_1.default.unlinkSync(uploadedFilePath);
            return res.status(400).json({ error: 'Unsupported file format.' });
        }
        if (ext === '.skb') {
            if (fs_1.default.existsSync(uploadedFilePath))
                fs_1.default.unlinkSync(uploadedFilePath);
            // NOTE: SketchUp files require the SketchUp C API. ODA doesn't support SKB natively without the BIM SDK.
            // We'll return an error explaining this limitation for SKB in Option 1.
            return res.status(400).json({ error: '.skb conversion requires Autodesk Forge or SKP SDK. Only .dwg is supported by ODA File Converter locally.' });
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
                        res.status(500).json({ error: err.message });
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
        res.status(500).json({ error: 'Server error during upload.' });
    }
};
exports.uploadAndConvert = uploadAndConvert;
