import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import crypto from 'crypto';
import DxfParser from 'dxf-parser';
import { Semaphore } from '../utils/semaphore';
import { redisClient } from '../config/redis';

const CACHE_TTL = 86400; // 24 hours in seconds

const converterSemaphore = new Semaphore(2); // Limit to 2 concurrent ODA conversions


export const uploadAndConvert = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const uploadedFilePath = req.file.path;
    const fileName = req.file.originalname;
    const ext = path.extname(fileName).toLowerCase();

    // 1. Generate SHA-256 hash of the uploaded file
    const fileBuffer = fs.readFileSync(uploadedFilePath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const cacheKey = `dxf:hash:${hash}`;

    // 2. Check if we already have this file converted and cached
    if (redisClient.isOpen) {
      try {
        const cachedStr = await redisClient.get(cacheKey);
        if (cachedStr) {
          // It's in cache! Clean up temp uploaded file and return instantly.
          if (fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
          const parsedDxf = JSON.parse(cachedStr);
          return res.json({ parsedDxf });
        }
      } catch (err) {
        console.warn(`Redis get error for key ${cacheKey}:`, err);
      }
    }

    if (ext === '.dxf') {
      // Direct DXF parsing
      const fileContent = fs.readFileSync(uploadedFilePath, 'utf-8');
      const parser = new DxfParser();
      try {
        const parsedDxf = parser.parseSync(fileContent);
        if (fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath); // cleanup
        
        // Save to cache
        if (redisClient.isOpen) {
          redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(parsedDxf)).catch(err => console.error(err));
        }

        return res.json({ parsedDxf });
      } catch (err: any) {
        if (fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
        return res.status(500).json({ error: 'Failed to parse DXF: ' + err.message });
      }
    }

    if (ext !== '.dwg' && ext !== '.skb' && ext !== '.skp') {
      if (fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
      return res.status(400).json({ error: 'Unsupported file format.' });
    }

    if (ext === '.skb' || ext === '.skp') {
      if (fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
      // NOTE: SketchUp files require the SketchUp C API. ODA doesn't support SKP/SKB natively without the BIM SDK.
      // We'll return an informative message directing user to upload via Canvas File Uploader for interactive 3D model blueprinting.
      return res.status(400).json({ error: '.skp/.skb conversion requires Autodesk Forge or SKP SDK. You can upload .skp files directly via "Upload File" to place an interactive 3D model blueprint card on your canvas.' });
    }

    // --- DWG Conversion using ODA File Converter ---
    
    // Create unique temp directories for this job
    const jobId = crypto.randomUUID();
    const inputDir = path.join(__dirname, '..', '..', 'tmp', `in_${jobId}`);
    const outputDir = path.join(__dirname, '..', '..', 'tmp', `out_${jobId}`);

    fs.mkdirSync(inputDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });

    // Move the uploaded file into the input directory
    const newFilePath = path.join(inputDir, fileName);
    fs.renameSync(uploadedFilePath, newFilePath);

    // Allow user to set the path in .env, otherwise default to standard Windows path
    const odaPath = process.env.ODA_CONVERTER_PATH || "C:\\Program Files\\ODA\\ODAFileConverter 27.1.0\\ODAFileConverter.exe";
    
    const command = `"${odaPath}" "${inputDir}" "${outputDir}" "ACAD2018" "DXF" "0" "0"`;

    // Queue the conversion using our Semaphore
    await converterSemaphore.run(async () => {
      return new Promise<void>((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
          try {
            if (error) {
              console.error("ODA Converter Error:", error);
              throw new Error('ODA File Converter failed. Is it installed at ' + odaPath + '?');
            }

            // Find the output .dxf file
            const convertedFiles = fs.readdirSync(outputDir);
            const dxfFile = convertedFiles.find(f => f.toLowerCase().endsWith('.dxf'));
            
            if (!dxfFile) {
              throw new Error('Conversion failed: No DXF file output found.');
            }

            const dxfPath = path.join(outputDir, dxfFile);
            const fileContent = fs.readFileSync(dxfPath, 'utf-8');
            
            const parser = new DxfParser();
            const parsedDxf = parser.parseSync(fileContent);

            // Save to cache
            if (redisClient.isOpen) {
              redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(parsedDxf)).catch(err => console.error(err));
            }

            res.json({ parsedDxf });
            resolve();
          } catch (err: any) {
            reject(err);
          } finally {
            // Cleanup temp directories
            if (fs.existsSync(inputDir)) fs.rmSync(inputDir, { recursive: true, force: true });
            if (fs.existsSync(outputDir)) fs.rmSync(outputDir, { recursive: true, force: true });
          }
        });
      });
    });

  } catch (error: any) {
    console.error("Upload error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Server error during upload.' });
    }
  }
};

/**
 * Extracts real embedded plan image from .dwg or .skp file.
 */
export const extractPlanPreview = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded.' });
      return;
    }

    const { extractPlanImageFromFile } = await import('../utils/cadThumbnailExtractor');
    const extracted = extractPlanImageFromFile(req.file.path);

    if (extracted && extracted.buffer) {
      const uniqueName = `extracted-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${extracted.mimeType === 'image/png' ? 'png' : extracted.mimeType === 'image/jpeg' ? 'jpg' : 'bmp'}`;
      const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'canvas');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      
      const savePath = path.join(uploadsDir, uniqueName);
      fs.writeFileSync(savePath, extracted.buffer);

      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        hasRealThumbnail: true,
        previewUrl: `/uploads/canvas/${uniqueName}`,
        mimeType: extracted.mimeType,
        size: extracted.buffer.length
      });
      return;
    }

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    res.json({
      success: false,
      hasRealThumbnail: false,
      message: 'No embedded raster thumbnail found in file structure.'
    });
  } catch (err: any) {
    console.error('Error extracting plan preview:', err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message || 'Failed to extract preview.' });
  }
};

