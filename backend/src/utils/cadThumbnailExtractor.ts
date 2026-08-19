import fs from 'fs';
import path from 'path';

export interface ExtractedPlanImage {
  buffer: Buffer;
  mimeType: string;
  width?: number;
  height?: number;
}

/**
 * Extracts embedded PNG, JPEG, or BMP image stream from a SketchUp (.skp / .skb) file.
 */
export function extractSkpThumbnail(buffer: Buffer): ExtractedPlanImage | null {
  // 1. Check for PNG signature (\x89PNG\r\n\x1a\n)
  const pngSig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const pngEndSig = Buffer.from([0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]); // IEND
  
  const pngStart = buffer.indexOf(pngSig);
  if (pngStart !== -1) {
    const pngEnd = buffer.indexOf(pngEndSig, pngStart);
    if (pngEnd !== -1) {
      const pngBuffer = buffer.slice(pngStart, pngEnd + pngEndSig.length);
      return {
        buffer: pngBuffer,
        mimeType: 'image/png'
      };
    }
  }

  // 2. Check for JPEG signature (\xFF\xD8\xFF ... \xFF\xD9)
  const jpgStartSig = Buffer.from([0xFF, 0xD8, 0xFF]);
  const jpgEndSig = Buffer.from([0xFF, 0xD9]);

  const jpgStart = buffer.indexOf(jpgStartSig);
  if (jpgStart !== -1) {
    const jpgEnd = buffer.indexOf(jpgEndSig, jpgStart);
    if (jpgEnd !== -1) {
      const jpgBuffer = buffer.slice(jpgStart, jpgEnd + jpgEndSig.length);
      return {
        buffer: jpgBuffer,
        mimeType: 'image/jpeg'
      };
    }
  }

  return null;
}

/**
 * Extracts embedded PNG, JPEG, or BMP image stream from an AutoCAD (.dwg / .dxf) file.
 */
export function extractDwgThumbnail(buffer: Buffer): ExtractedPlanImage | null {
  // 1. Search for PNG signature in DWG (AutoCAD 2013+ AC1027, AC1032)
  const pngSig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const pngEndSig = Buffer.from([0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]); // IEND
  
  const pngStart = buffer.indexOf(pngSig);
  if (pngStart !== -1) {
    const pngEnd = buffer.indexOf(pngEndSig, pngStart);
    if (pngEnd !== -1) {
      const pngBuffer = buffer.slice(pngStart, pngEnd + pngEndSig.length);
      return {
        buffer: pngBuffer,
        mimeType: 'image/png'
      };
    }
  }

  // 2. Search for JPEG signature in DWG
  const jpgStartSig = Buffer.from([0xFF, 0xD8, 0xFF]);
  const jpgEndSig = Buffer.from([0xFF, 0xD9]);

  const jpgStart = buffer.indexOf(jpgStartSig);
  if (jpgStart !== -1) {
    const jpgEnd = buffer.indexOf(jpgEndSig, jpgStart);
    if (jpgEnd !== -1) {
      const jpgBuffer = buffer.slice(jpgStart, jpgEnd + jpgEndSig.length);
      return {
        buffer: jpgBuffer,
        mimeType: 'image/jpeg'
      };
    }
  }

  // 3. Search for BMP signature 'BM' in DWG
  for (let i = 0; i < buffer.length - 54; i++) {
    if (buffer[i] === 0x42 && buffer[i+1] === 0x4D) { // 'BM'
      const fileSize = buffer.readUInt32LE(i + 2);
      if (fileSize > 54 && fileSize < 20 * 1024 * 1024 && (i + fileSize) <= buffer.length) {
        const dibHeaderSize = buffer.readUInt32LE(i + 14);
        if (dibHeaderSize === 40 || dibHeaderSize === 108 || dibHeaderSize === 124) {
          const bmpBuffer = buffer.slice(i, i + fileSize);
          return {
            buffer: bmpBuffer,
            mimeType: 'image/bmp'
          };
        }
      }
    }
  }

  return null;
}

/**
 * Universal extractor for any CAD/BIM drawing or model file.
 */
export function extractPlanImageFromFile(filePath: string): ExtractedPlanImage | null {
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.skp' || ext === '.skb') {
    return extractSkpThumbnail(buffer);
  } else if (ext === '.dwg' || ext === '.dxf') {
    return extractDwgThumbnail(buffer);
  }

  return null;
}
